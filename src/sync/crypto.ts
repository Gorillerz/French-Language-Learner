/**
 * All of sync's cryptography, on WebCrypto only (ADR 0001).
 *
 * A random data key encrypts records with AES-256-GCM. It is wrapped twice, by
 * keys derived from the passphrase and from the recovery code, and the wrapped
 * bundle is what the cloud stores. A second random key turns row ids into opaque
 * record ids, because built-in row ids contain readable French.
 *
 * Every key this module hands out is non-extractable, so it can be kept in
 * IndexedDB without its raw bytes ever being written anywhere.
 */

const PBKDF2_ITERATIONS = 600_000;
/** A bundle comes from the cloud, so its work factor is bounded in both directions. */
const MAX_PBKDF2_ITERATIONS = 10_000_000;
const IV_BYTES = 12;
const SALT_BYTES = 16;
/** 160 bits, which is 32 characters of the 5-bit alphabet below. */
const RECOVERY_CODE_BYTES = 20;
const RECOVERY_CODE_LENGTH = 32;
/** Crockford's base 32: no I, L, O or U, so a code survives being copied by hand. */
const RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BLOB_VERSION = "v1";

export const MIN_PASSPHRASE_LENGTH = 15;

/** The passphrase or recovery code did not open the bundle, or the bundle is unusable. */
export class UnlockFailedError extends Error {}

/** A blob failed authentication: wrong key, altered, or moved from another record. */
export class UnreadableRecordError extends Error {}

export class WeakPassphraseError extends Error {}

export type SyncKeys = {
  dataKey: CryptoKey;
  recordIdKey: CryptoKey;
};

type SlotName = "passphrase" | "recovery";

export type KeySlot = {
  iterations: number;
  salt: string;
  iv: string;
  wrappedKey: string;
};

export type KeyBundle = {
  version: 1;
  passphrase: KeySlot;
  recovery: KeySlot;
  /** The record-id key, encrypted under the data key, so rewrapping leaves it alone. */
  recordIdKey: string;
};

export function isLongEnough(passphrase: string) {
  return [...normalizePassphrase(passphrase)].length >= MIN_PASSPHRASE_LENGTH;
}

/**
 * True for what length alone lets through: one pattern, shorter than the minimum
 * length, over and over. The repeats add nothing, so it is as weak as the pattern.
 */
export function isRepetitive(passphrase: string) {
  const characters = [...normalizePassphrase(passphrase)];
  const longestPattern = Math.min(MIN_PASSPHRASE_LENGTH - 1, Math.floor(characters.length / 2));
  for (let size = 1; size <= longestPattern; size++) {
    if (characters.slice(size).every((character, index) => character === characters[index])) {
      return true;
    }
  }
  return false;
}

export function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_CODE_BYTES));
  let bits = 0;
  let bitCount = 0;
  let code = "";
  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      bitCount -= 5;
      code += RECOVERY_ALPHABET[(bits >> bitCount) & 31];
    }
    bits &= (1 << bitCount) - 1;
  }
  return code.match(/.{4}/g)!.join("-");
}

export async function createKeyBundle(passphrase: string, recoveryCode: string) {
  requireStrongEnough(passphrase);
  const dataKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const recordIdKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const bundle: KeyBundle = {
    version: 1,
    passphrase: await sealSlot("passphrase", passphrase, dataKey),
    recovery: await sealSlot("recovery", canonicalRecoveryCode(recoveryCode), dataKey),
    recordIdKey: toBase64(await sealRecordIdKey(dataKey, recordIdKeyBytes)),
  };
  return { bundle, keys: await unlockWithPassphrase(bundle, passphrase) };
}

export async function unlockWithPassphrase(bundle: KeyBundle, passphrase: string) {
  return keysFrom(bundle, await openSlot(bundle, "passphrase", passphrase, false));
}

/**
 * Rewraps the data key for a new passphrase, proving the right to do so with the
 * recovery code. The data key, the recovery wrap and every record stay as they are.
 */
export async function replacePassphrase(
  bundle: KeyBundle,
  recoveryCode: string,
  newPassphrase: string,
) {
  requireStrongEnough(newPassphrase);
  const code = canonicalRecoveryCode(recoveryCode);
  const dataKey = await openSlot(bundle, "recovery", code, true);
  const rewrapped: KeyBundle = {
    ...bundle,
    passphrase: await sealSlot("passphrase", newPassphrase, dataKey),
  };
  return { bundle: rewrapped, keys: await unlockWithPassphrase(rewrapped, newPassphrase) };
}

export async function recordIdFor(keys: SyncKeys, table: string, rowId: string) {
  const mac = await crypto.subtle.sign("HMAC", keys.recordIdKey, encode(`${table}/${rowId}`));
  return toBase64(new Uint8Array(mac)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function encryptRecord(keys: SyncKeys, recordId: string, value: unknown) {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: recordContext(recordId) },
    keys.dataKey,
    encode(JSON.stringify(value)),
  );
  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv);
  payload.set(new Uint8Array(ciphertext), iv.length);
  return `${BLOB_VERSION}.${toBase64(payload)}`;
}

export async function decryptRecord(keys: SyncKeys, recordId: string, blob: string) {
  try {
    if (!blob.startsWith(`${BLOB_VERSION}.`)) throw new Error("Unknown blob version");
    const payload = fromBase64(blob.slice(BLOB_VERSION.length + 1));
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: payload.slice(0, IV_BYTES),
        additionalData: recordContext(recordId),
      },
      keys.dataKey,
      payload.slice(IV_BYTES),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
  } catch {
    throw new UnreadableRecordError(`Record ${recordId} failed authentication`);
  }
}

function requireStrongEnough(passphrase: string) {
  if (!isLongEnough(passphrase)) {
    throw new WeakPassphraseError(`A passphrase needs ${MIN_PASSPHRASE_LENGTH} or more characters`);
  }
  if (isRepetitive(passphrase)) {
    throw new WeakPassphraseError("A passphrase cannot be one short pattern repeated");
  }
}

/** Accented letters arrive in different Unicode forms on different keyboards. */
export function normalizePassphrase(passphrase: string) {
  return passphrase.normalize("NFKC");
}

function canonicalRecoveryCode(code: string) {
  const canonical = code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replaceAll("O", "0")
    .replaceAll("I", "1")
    .replaceAll("L", "1");
  if (canonical.length !== RECOVERY_CODE_LENGTH) throw new UnlockFailedError("Not a recovery code");
  return canonical;
}

async function deriveWrappingKey(secret: string, salt: BufferSource, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    encode(normalizePassphrase(secret)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/** Ties a wrap to its slot and work factor, so neither can be changed unnoticed. */
function slotContext(name: SlotName, iterations: number, salt: string) {
  return encode(`french-learning:key-slot:v1:${name}:${iterations}:${salt}`);
}

function recordContext(recordId: string) {
  return encode(`french-learning:record:${BLOB_VERSION}:${recordId}`);
}

const recordIdKeyContext = encode("french-learning:record-id-key:v1");

async function sealSlot(name: SlotName, secret: string, dataKey: CryptoKey): Promise<KeySlot> {
  const saltBytes = randomBytes(SALT_BYTES);
  const salt = toBase64(saltBytes);
  const iv = randomBytes(IV_BYTES);
  const wrappingKey = await deriveWrappingKey(secret, saltBytes, PBKDF2_ITERATIONS);
  const wrappedKey = await crypto.subtle.wrapKey("raw", dataKey, wrappingKey, {
    name: "AES-GCM",
    iv,
    additionalData: slotContext(name, PBKDF2_ITERATIONS, salt),
  });
  return {
    iterations: PBKDF2_ITERATIONS,
    salt,
    iv: toBase64(iv),
    wrappedKey: toBase64(new Uint8Array(wrappedKey)),
  };
}

/** `extractable` is only ever true inside this module, to rewrap the key. */
async function openSlot(bundle: KeyBundle, name: SlotName, secret: string, extractable: boolean) {
  const slot = bundle[name];
  if (
    !Number.isInteger(slot.iterations) ||
    slot.iterations < PBKDF2_ITERATIONS ||
    slot.iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new UnlockFailedError("The key bundle has an unacceptable work factor");
  }
  try {
    const wrappingKey = await deriveWrappingKey(secret, fromBase64(slot.salt), slot.iterations);
    return await crypto.subtle.unwrapKey(
      "raw",
      fromBase64(slot.wrappedKey),
      wrappingKey,
      {
        name: "AES-GCM",
        iv: fromBase64(slot.iv),
        additionalData: slotContext(name, slot.iterations, slot.salt),
      },
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new UnlockFailedError("That secret did not open the key bundle");
  }
}

async function sealRecordIdKey(dataKey: CryptoKey, keyBytes: BufferSource) {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: recordIdKeyContext },
    dataKey,
    keyBytes,
  );
  const sealed = new Uint8Array(iv.length + ciphertext.byteLength);
  sealed.set(iv);
  sealed.set(new Uint8Array(ciphertext), iv.length);
  return sealed;
}

async function keysFrom(bundle: KeyBundle, dataKey: CryptoKey): Promise<SyncKeys> {
  try {
    const sealed = fromBase64(bundle.recordIdKey);
    const keyBytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: sealed.slice(0, IV_BYTES), additionalData: recordIdKeyContext },
      dataKey,
      sealed.slice(IV_BYTES),
    );
    const recordIdKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return { dataKey, recordIdKey };
  } catch {
    throw new UnlockFailedError("The key bundle is damaged");
  }
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function encode(text: string) {
  return new TextEncoder().encode(text);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string) {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}
