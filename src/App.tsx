import { useEffect, useState } from "react";
import { AiArea } from "./ai/AiArea";
import { useConnection, useConnectionNotice, type Connection } from "./connection";
import { GrammarArea } from "./grammar/GrammarArea";
import { useIsOfflineReady } from "./offlineReady";
import { ProgressArea } from "./progress/ProgressArea";
import { QuizArea } from "./quiz/QuizArea";
import { startSync, useSyncState, type SyncStatus } from "./sync/engine";
import { SyncArea } from "./sync/SyncArea";
import { VocabularyArea } from "./vocabulary/VocabularyArea";

const areas = ["Vocabulary", "Grammar", "Quiz", "Progress", "Sync", "AI"] as const;
type Area = (typeof areas)[number];

const connectionLabels: Record<Connection, string> = {
  online: "Online",
  offline: "Offline",
  lost: "Connection lost",
};

const syncLabels: Partial<Record<SyncStatus, string>> = {
  "not-set-up": "Sync: not set up",
  syncing: "Sync: syncing",
  "up-to-date": "Sync: up to date",
  waiting: "Sync: waiting for connection",
  refused: "Sync: failed",
  "sign-in-required": "Sync: sign in again",
};

const noticeText = {
  lost: "Connection lost. You can keep working.",
  restored: "Connection restored.",
};

const syncNoticeText = {
  lost: "Your changes will sync when it returns.",
  restored: "Your changes are syncing.",
};

const statusesWithSync: SyncStatus[] = ["syncing", "up-to-date", "waiting"];

export function App() {
  const [area, setArea] = useState<Area>("Vocabulary");
  const connection = useConnection();
  const notice = useConnectionNotice();
  const isOfflineReady = useIsOfflineReady();
  const syncStatus = useSyncState().status;
  const syncLabel = syncLabels[syncStatus];

  useEffect(() => {
    void startSync();
  }, []);

  return (
    <div className="shell">
      <header className="shell-header">
        <h1>French Learning</h1>
        <div className="shell-status">
          {isOfflineReady && <span>Ready for offline use</span>}
          {syncLabel && (
            <p role="status" aria-label="Sync">
              {syncLabel}
            </p>
          )}
          <p
            role="status"
            aria-label="Connection"
            className={connection === "online" ? "connection" : "connection connection-offline"}
          >
            {connectionLabels[connection]}
          </p>
        </div>
        {notice && (
          <p role="status" aria-label="Network notice" className={`notice notice-${notice}`}>
            {noticeText[notice]}
            {statusesWithSync.includes(syncStatus) && ` ${syncNoticeText[notice]}`}
          </p>
        )}
      </header>

      <nav className="shell-nav" aria-label="Areas">
        {areas.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={name === area ? "page" : undefined}
            onClick={() => setArea(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      <main className="shell-main">
        <h2>{area}</h2>
        {area === "Vocabulary" && <VocabularyArea />}
        {area === "Grammar" && <GrammarArea />}
        {area === "Quiz" && <QuizArea />}
        {area === "Progress" && <ProgressArea />}
        {area === "Sync" && <SyncArea />}
        {area === "AI" && <AiArea />}
      </main>
    </div>
  );
}
