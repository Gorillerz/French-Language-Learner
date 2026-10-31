import { db, syncedTables } from "../db";
import * as cloud from "./cloudClient";
import {
  createKeyBundle,
  generateRecoveryCode,
  isLongEnough,
  isRepetitive,
  MIN_PASSPHRASE_LENGTH,
  normalizePassphrase,
  replacePassphrase,
  unlockWithPassphrase,
  type KeyBundle,
  type SyncKeys,
} from "./crypto";
import { startSync } from "./engine";

/**
 * The steps that join a device to the cloud. The passphrase, recovery code and
 * sign-in password pass through here but are never stored; the account token and
 * the non-extractable keys are.
 */

/** Sign-in details held in memory until the device has its keys. */
export type SignedInAccount = { email: string; signInPassword: string; token: string };

export type NewBundle = { bundle: KeyBundle; keys: SyncKeys; recoveryCode: string };

export async function signIn(email: string, signInPassword: string): Promise<SignedInAccount> {
  return { email, signInPassword, token: await cloud.signIn(email, signInPassword) };
}

export async function createAccount(email: string, signInPassword: string): Promise<SignedInAccount> {
  return { email, signInPassword, token: await cloud.signUp(email, signInPassword) };
}

/** For recovery on a device already set up, which holds no sign-in password. */
export async function signInOnThisDevice(signInPassword: string) {
  const device = await db.syncDevice.get("this");
  if (!device) throw new Error("This device is not set up");
  return signIn(device.email, signInPassword);
}

export function findKeyBundle({ token }: SignedInAccount) {
  return cloud.getKeyBundle(token);
}

/**
 * The sign-in password reaches the host, so a passphrase equal to it would hand the
 * host the keys. Uniqueness beyond that can only be asked for, not checked.
 */
export function passphraseProblem(passphrase: string, repeated: string, account: SignedInAccount) {
  if (!isLongEnough(passphrase)) return `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  if (isRepetitive(passphrase)) {
    return "That only repeats a short pattern, which is easy to guess. Use varied words instead.";
  }
  if (normalizePassphrase(passphrase) === normalizePassphrase(account.signInPassword)) {
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
export async function finishFirstDevice(account: SignedInAccount, { bundle, keys }: NewBundle) {
  await cloud.putKeyBundle(account.token, bundle, null);
  await enrollDevice(account, keys);
}

export async function joinWithPassphrase(
  account: SignedInAccount,
  stored: cloud.StoredKeyBundle,
  passphrase: string,
) {
  await enrollDevice(account, await unlockWithPassphrase(stored.bundle, passphrase));
}

export async function recoverWithCode(
  account: SignedInAccount,
  stored: cloud.StoredKeyBundle,
  recoveryCode: string,
  newPassphrase: string,
) {
  const { bundle, keys } = await replacePassphrase(stored.bundle, recoveryCode, newPassphrase);
  await cloud.putKeyBundle(account.token, bundle, stored.version);
  await enrollDevice(account, keys);
}

async function enrollDevice({ email, token }: SignedInAccount, keys: SyncKeys) {
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
