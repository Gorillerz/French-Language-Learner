import { db, syncedTables } from "../db";
import * as cloud from "./cloudClient";
import {
  createKeyBundle,
  generateRecoveryCode,
  isLongEnough,
  MIN_PASSPHRASE_LENGTH,
  replacePassphrase,
  unlockWithPassphrase,
  type KeyBundle,
  type SyncKeys,
} from "./crypto";
import { startSync } from "./engine";

/**
 * The steps that join a device to the cloud. The passphrase, recovery code and
 * sign-in password pass through here but are never stored; the session token and
 * the non-extractable keys are.
 */

/** Sign-in details held in memory until the device has its keys. */
export type Session = { email: string; signInPassword: string; token: string };

export type NewBundle = { bundle: KeyBundle; keys: SyncKeys; recoveryCode: string };

export async function signIn(email: string, signInPassword: string): Promise<Session> {
  return { email, signInPassword, token: await cloud.signIn(email, signInPassword) };
}

export async function createAccount(email: string, signInPassword: string): Promise<Session> {
  return { email, signInPassword, token: await cloud.signUp(email, signInPassword) };
}

export function findKeyBundle({ token }: Session) {
  return cloud.getKeyBundle(token);
}

/**
 * The sign-in password reaches the host, so a passphrase equal to it would hand the
 * host the keys. Uniqueness beyond that can only be asked for, not checked.
 */
export function passphraseProblem(passphrase: string, repeated: string, session: Session) {
  if (!isLongEnough(passphrase)) return `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  if (passphrase === session.signInPassword) {
    return "Your passphrase must be different from your sign-in password.";
  }
  if (passphrase !== repeated) return "The two passphrases do not match.";
  return null;
}

export async function prepareFirstDevice(passphrase: string): Promise<NewBundle> {
  const recoveryCode = generateRecoveryCode();
  const { bundle, keys } = await createKeyBundle(passphrase, recoveryCode);
  return { bundle, keys, recoveryCode };
}

/** Uploading waits for this step, so an abandoned setup leaves nothing behind. */
export async function finishFirstDevice(session: Session, { bundle, keys }: NewBundle) {
  await cloud.putKeyBundle(session.token, bundle, null);
  await enrollDevice(session, keys);
}

export async function joinWithPassphrase(
  session: Session,
  stored: cloud.StoredKeyBundle,
  passphrase: string,
) {
  await enrollDevice(session, await unlockWithPassphrase(stored.bundle, passphrase));
}

export async function recoverWithCode(
  session: Session,
  stored: cloud.StoredKeyBundle,
  recoveryCode: string,
  newPassphrase: string,
) {
  const { bundle, keys } = await replacePassphrase(stored.bundle, recoveryCode, newPassphrase);
  await cloud.putKeyBundle(session.token, bundle, stored.version);
  await enrollDevice(session, keys);
}

async function enrollDevice({ email, token }: Session, keys: SyncKeys) {
  await db.syncDevice.put({
    id: "this",
    email,
    token,
    keys,
    cursor: 0,
    cursorTables: syncedTables.join(),
  });
  await startSync();
}

/** After the cloud refuses the stored token. The keys on this device are untouched. */
export async function signInAgain(password: string) {
  const device = await db.syncDevice.get("this");
  if (!device) return;
  const token = await cloud.signIn(device.email, password);
  await db.syncDevice.update("this", { token });
  await startSync();
}
