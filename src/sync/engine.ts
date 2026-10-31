import { useSyncExternalStore } from "react";
import { reportCloudReachable } from "../connection";
import { db, syncedTables, type SyncDevice } from "../db";
import { cloudTarget, syncPollMs } from "../serviceConfig";
import * as cloud from "./cloudClient";
import { decryptRecord, encryptRecord, recordIdFor, type SyncKeys } from "./crypto";

/**
 * Background sync. It runs in cycles: pull, then push. Nothing here blocks study:
 * the local store stays the source of truth, and a failed cycle just retries.
 *
 * What needs pushing is derived, not queued: a row is dirty when its `savedAt`
 * differs from the `savedAt` the cloud is known to hold (`syncedVersions`). That
 * survives closing the app, needs no work per write path, covers rows that existed
 * before setup, and lets a table join sync by being listed in `syncedTables`.
 */

export type SyncStatus =
  | "checking"
  | "unavailable"
  | "not-set-up"
  | "syncing"
  | "up-to-date"
  | "waiting"
  | "sign-in-required";

type SyncState = {
  status: SyncStatus;
  /** Records this session that failed authentication and were ignored. */
  unreadableRecords: number;
};

type SyncedRow = { id: string; savedAt: string };
type Envelope = { table: string; row: SyncedRow };

const WRITE_DEBOUNCE_MS = 300;
const PUSH_BATCH_SIZE = 100;

let state: SyncState = { status: "checking", unreadableRecords: 0 };
const listeners = new Set<() => void>();

function setState(change: Partial<SyncState>) {
  state = { ...state, ...change };
  for (const listener of listeners) listener();
}

export function useSyncState() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => state,
  );
}

let timer: ReturnType<typeof setTimeout> | undefined;
let isRunning = false;
let runAgain = false;
let isListening = false;
let isApplyingPulledRows = false;

function schedule(delayMs: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void runCycle(), delayMs);
}

function onLocalWrite() {
  if (isApplyingPulledRows) return;
  if (state.status === "up-to-date") setState({ status: "syncing" });
  if (state.status === "syncing" || state.status === "waiting") schedule(WRITE_DEBOUNCE_MS);
}

for (const name of syncedTables) {
  const table = db.table(name);
  table.hook("creating", (_key, _row, transaction) => {
    transaction.on("complete", onLocalWrite);
  });
  table.hook("updating", (_changes, _key, _row, transaction) => {
    transaction.on("complete", onLocalWrite);
  });
  table.hook("deleting", (_key, _row, transaction) => {
    transaction.on("complete", onLocalWrite);
  });
}

/** Safe to call more than once: at launch, and again when setup finishes. */
export async function startSync() {
  if (!cloudTarget.available) {
    setState({ status: "unavailable" });
    return;
  }
  if (!isListening) {
    isListening = true;
    window.addEventListener("online", syncNow);
    window.addEventListener("offline", syncNow);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncNow();
    });
  }
  setState({ status: (await db.syncDevice.get("this")) ? "syncing" : "not-set-up" });
  syncNow();
}

export function syncNow() {
  schedule(0);
}

async function runCycle() {
  if (isRunning) {
    runAgain = true;
    return;
  }
  isRunning = true;
  let shouldPoll = true;
  try {
    const device = await db.syncDevice.get("this");
    if (!device) {
      shouldPoll = false;
      return;
    }
    if (!navigator.onLine) {
      reportCloudReachable(false);
      setState({ status: "waiting" });
      return;
    }
    await pullChanges(device);
    await pushDirtyRows(device);
    reportCloudReachable(true);
    setState({ status: "up-to-date" });
  } catch (error) {
    if (error instanceof cloud.SignInRequiredError) {
      shouldPoll = false;
      reportCloudReachable(true);
      setState({ status: "sign-in-required" });
    } else {
      if (error instanceof cloud.CloudUnreachableError) reportCloudReachable(false);
      else console.error("Sync failed", error);
      setState({ status: "waiting" });
    }
  } finally {
    isRunning = false;
    if (runAgain) {
      runAgain = false;
      schedule(0);
    } else if (shouldPoll) {
      schedule(syncPollMs);
    }
  }
}

async function pullChanges(device: SyncDevice) {
  const tables = syncedTables.join();
  let cursor = device.cursorTables === tables ? device.cursor : 0;
  let hasMore = true;
  while (hasMore) {
    const page = await cloud.pull(device.token, cursor);
    const envelopes: Envelope[] = [];
    for (const { id, blob } of page.records) {
      const envelope = await openRecord(device.keys, id, blob);
      if (envelope) envelopes.push(envelope);
    }
    await applyPulledRows(envelopes, page.cursor, tables);
    cursor = page.cursor;
    hasMore = page.hasMore;
  }
}

/**
 * Null when the record cannot be used. An unreadable one is reported but does not
 * stop sync, or the cloud could halt it for good with one bad blob. One for a table
 * this version does not know is skipped until `cursorTables` replays it.
 */
async function openRecord(keys: SyncKeys, id: string, blob: string) {
  let value: unknown;
  try {
    value = await decryptRecord(keys, id, blob);
  } catch {
    setState({ unreadableRecords: state.unreadableRecords + 1 });
    return null;
  }
  const { table, row } = value as Partial<Envelope>;
  const isUsable =
    (syncedTables as readonly unknown[]).includes(table) &&
    typeof row?.id === "string" &&
    typeof row.savedAt === "string";
  return isUsable ? (value as Envelope) : null;
}

/** Most-recent-save. Rows saved at the same instant still pick the same winner everywhere. */
function isNewer(incoming: SyncedRow, local: SyncedRow) {
  const incomingTime = Date.parse(incoming.savedAt);
  const localTime = Date.parse(local.savedAt);
  if (incomingTime !== localTime) return incomingTime > localTime;
  return JSON.stringify(incoming) > JSON.stringify(local);
}

function applyPulledRows(envelopes: Envelope[], cursor: number, tables: string) {
  isApplyingPulledRows = true;
  return db
    .transaction(
      "rw",
      [...syncedTables.map((name) => db.table(name)), db.syncedVersions, db.syncDevice],
      async () => {
        for (const { table, row } of envelopes) {
          const local = await db.table<SyncedRow, string>(table).get(row.id);
          if (!local || isNewer(row, local)) await db.table(table).put(row);
          // Recorded even when the local row won: it then counts as dirty and is
          // pushed, so the cloud ends up holding the winner for any later device.
          await db.syncedVersions.put({ key: versionKey(table, row), savedAt: row.savedAt });
        }
        await db.syncDevice.update("this", { cursor, cursorTables: tables });
      },
    )
    .finally(() => {
      isApplyingPulledRows = false;
    });
}

function versionKey(table: string, row: SyncedRow) {
  return `${table}/${row.id}`;
}

async function findDirtyRows() {
  const versions = await db.syncedVersions.toArray();
  const cloudSavedAt = new Map(versions.map(({ key, savedAt }) => [key, savedAt]));
  const dirty: Envelope[] = [];
  for (const table of syncedTables) {
    const rows = await db.table<SyncedRow, string>(table).toArray();
    for (const row of rows) {
      // Untouched built-in rows are seeded on every device, so they never travel.
      const isLearnerSaved = Date.parse(row.savedAt) > 0;
      if (isLearnerSaved && cloudSavedAt.get(versionKey(table, row)) !== row.savedAt) {
        dirty.push({ table, row });
      }
    }
  }
  return dirty;
}

async function pushDirtyRows({ keys, token }: SyncDevice) {
  const dirty = await findDirtyRows();
  for (let start = 0; start < dirty.length; start += PUSH_BATCH_SIZE) {
    const batch = dirty.slice(start, start + PUSH_BATCH_SIZE);
    const records = await Promise.all(
      batch.map(async (envelope) => {
        const id = await recordIdFor(keys, envelope.table, envelope.row.id);
        return { id, blob: await encryptRecord(keys, id, envelope) };
      }),
    );
    await cloud.push(token, records);
    // The savedAt that was encrypted, so an edit made meanwhile stays dirty.
    await db.syncedVersions.bulkPut(
      batch.map(({ table, row }) => ({ key: versionKey(table, row), savedAt: row.savedAt })),
    );
  }
}
