import { cloudTarget } from "../serviceConfig";
import type { KeyBundle } from "./crypto";

/** The speaking end of docs/sync-contract.md. */

const TIMEOUT_MS = 15_000;
const PULL_PAGE_SIZE = 200;

/** No answer, a timeout, or a server fault: try again later. */
export class CloudUnreachableError extends Error {}
/** The cloud answered and turned the request down, so waiting for a connection won't help. */
export class CloudRefusedError extends Error {}
/** The token or the sign-in details were refused. */
export class SignInRequiredError extends Error {}
export class AccountExistsError extends Error {}
/** The key bundle changed since it was read. */
export class KeyBundleConflictError extends Error {}

export type CloudRecord = { id: string; blob: string };
export type StoredKeyBundle = { bundle: KeyBundle; version: unknown };
export type PulledPage = {
  records: (CloudRecord & { cursor: number })[];
  cursor: number;
  hasMore: boolean;
};

type Call = { method?: string; token?: string; body?: unknown };

async function send(path: string, { method = "GET", token, body }: Call) {
  if (!cloudTarget.available) throw new CloudUnreachableError("No usable cloud is configured");
  let response: Response;
  try {
    response = await fetch(`${cloudTarget.baseUrl}${path}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: "omit",
      cache: "no-store",
      // A redirect could lead away from the HTTPS address that was checked.
      redirect: "error",
    });
  } catch {
    throw new CloudUnreachableError(`No answer from ${path}`);
  }
  if (response.status === 401) throw new SignInRequiredError(`${path} needs a sign-in`);
  if (response.status >= 500) throw new CloudUnreachableError(`${path} failed`);
  return response;
}

async function parsed<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    // A captive portal, or something else that is not the cloud, answered.
    throw new CloudUnreachableError("The reply was not from the cloud");
  }
}

async function expectOk(response: Response) {
  if (!response.ok) throw new CloudRefusedError(`Unexpected status ${response.status}`);
  return response;
}

export async function signUp(email: string, password: string) {
  const response = await send("/sign-up", { method: "POST", body: { email, password } });
  if (response.status === 409) throw new AccountExistsError();
  return (await parsed<{ token: string }>(await expectOk(response))).token;
}

export async function signIn(email: string, password: string) {
  const response = await send("/sign-in", { method: "POST", body: { email, password } });
  return (await parsed<{ token: string }>(await expectOk(response))).token;
}

export async function getKeyBundle(token: string) {
  const response = await send("/key-bundle", { token });
  if (response.status === 404) return null;
  return parsed<StoredKeyBundle>(await expectOk(response));
}

/** `replaces` is the version that was read, or null for the first bundle. */
export async function putKeyBundle(token: string, bundle: KeyBundle, replaces: unknown) {
  const response = await send("/key-bundle", {
    method: "PUT",
    token,
    body: { bundle, replaces },
  });
  if (response.status === 409) throw new KeyBundleConflictError();
  await expectOk(response);
}

export async function push(token: string, records: CloudRecord[]) {
  await expectOk(await send("/push", { method: "POST", token, body: { records } }));
}

export async function pull(token: string, since: number) {
  const response = await send(`/pull?since=${since}&limit=${PULL_PAGE_SIZE}`, { token });
  return parsed<PulledPage>(await expectOk(response));
}
