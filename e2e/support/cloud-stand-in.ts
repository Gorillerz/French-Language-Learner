import type { RecordedRequest, Reply } from "./service-stand-in";
import { ServiceStandIn } from "./service-stand-in";

export type StoredRecord = { id: string; blob: string; cursor: number };

type Account = {
  email: string;
  password: string;
  keyBundle: { bundle: unknown; version: number } | null;
  records: Map<string, StoredRecord>;
  cursor: number;
};

/**
 * The reference implementation of docs/sync-contract.md. Tests read what it holds
 * through the accessors below, as a nosy host could. `respond` still overrides any
 * route, and anything outside the contract still gets a 501.
 */
export class CloudStandIn extends ServiceStandIn {
  private readonly accounts = new Map<string, Account>();
  private readonly sessions = new Map<string, Account>();

  constructor(port: number) {
    super(port);
    this.respond("POST", "/sign-up", (request) => this.signUp(request));
    this.respond("POST", "/sign-in", (request) => this.signIn(request));
    this.respond("GET", "/key-bundle", (request) =>
      this.authorized(request, (account) =>
        account.keyBundle ? { json: account.keyBundle } : { status: 404, json: {} },
      ),
    );
    this.respond("PUT", "/key-bundle", (request) =>
      this.authorized(request, (account) => this.putKeyBundle(account, request)),
    );
    this.respond("POST", "/push", (request) =>
      this.authorized(request, (account) => this.push(account, request)),
    );
    this.respond("GET", "/pull", (request) =>
      this.authorized(request, (account) => this.pull(account, request)),
    );
  }

  /** Every encrypted record held for every account. */
  storedRecords(): StoredRecord[] {
    return [...this.accounts.values()].flatMap((account) => [...account.records.values()]);
  }

  storedKeyBundles(): unknown[] {
    return [...this.accounts.values()].flatMap((account) => account.keyBundle?.bundle ?? []);
  }

  /** Everything a host could read: ids, blobs (raw and decoded) and key bundles. */
  everythingStored(): string {
    const records = this.storedRecords();
    return [
      JSON.stringify(records),
      JSON.stringify(this.storedKeyBundles()),
      ...records.map(({ blob }) => Buffer.from(blob.split(".").at(-1)!, "base64").toString("latin1")),
    ].join("\n");
  }

  /** Everything that crossed the wire, as a host or interceptor would have seen it. */
  everythingReceived(): string {
    return JSON.stringify(this.requests);
  }

  /** Ordinary sign-in reset: a new password, with no effect on stored data. */
  resetSignIn(email: string, password: string) {
    this.accountFor(email).password = password;
    this.expireSessions();
  }

  expireSessions() {
    this.sessions.clear();
  }

  /** A malicious host swaps two stored blobs, keeping their ids. */
  swapBlobs(firstId: string, secondId: string) {
    const records = new Map(this.storedRecords().map((record) => [record.id, record]));
    const first = records.get(firstId)!;
    const second = records.get(secondId)!;
    [first.blob, second.blob] = [second.blob, first.blob];
    for (const account of this.accounts.values()) {
      for (const record of [first, second]) {
        if (account.records.has(record.id)) record.cursor = ++account.cursor;
      }
    }
  }

  private accountFor(email: string) {
    const account = this.accounts.get(email);
    if (!account) throw new Error(`No account for ${email}`);
    return account;
  }

  private signUp(request: RecordedRequest): Reply {
    const { email, password } = request.body as { email: string; password: string };
    if (this.accounts.has(email)) return { status: 409, json: {} };
    const account: Account = { email, password, keyBundle: null, records: new Map(), cursor: 0 };
    this.accounts.set(email, account);
    return { status: 201, json: { token: this.openSession(account) } };
  }

  private signIn(request: RecordedRequest): Reply {
    const { email, password } = request.body as { email: string; password: string };
    const account = this.accounts.get(email);
    if (account?.password !== password) return { status: 401, json: {} };
    return { json: { token: this.openSession(account) } };
  }

  private openSession(account: Account) {
    const token = crypto.randomUUID();
    this.sessions.set(token, account);
    return token;
  }

  private authorized(request: RecordedRequest, handler: (account: Account) => Reply): Reply {
    const token = request.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const account = this.sessions.get(token);
    return account ? handler(account) : { status: 401, json: {} };
  }

  private putKeyBundle(account: Account, request: RecordedRequest): Reply {
    const { bundle, replaces } = request.body as { bundle: unknown; replaces: number | null };
    if ((account.keyBundle?.version ?? null) !== replaces) return { status: 409, json: {} };
    const version = (account.keyBundle?.version ?? 0) + 1;
    account.keyBundle = { bundle, version };
    return { json: { version } };
  }

  private push(account: Account, request: RecordedRequest): Reply {
    const { records } = request.body as { records: { id: string; blob: string }[] };
    for (const { id, blob } of records) {
      account.records.set(id, { id, blob, cursor: ++account.cursor });
    }
    return { json: { cursor: account.cursor } };
  }

  private pull(account: Account, request: RecordedRequest): Reply {
    const query = new URL(request.path, this.url).searchParams;
    const since = Number(query.get("since") ?? 0);
    const limit = Number(query.get("limit") ?? 100);
    const newer = [...account.records.values()]
      .filter((record) => record.cursor > since)
      .sort((a, b) => a.cursor - b.cursor);
    const page = newer.slice(0, limit);
    return {
      json: {
        records: page,
        cursor: page.at(-1)?.cursor ?? since,
        hasMore: newer.length > page.length,
      },
    };
  }
}
