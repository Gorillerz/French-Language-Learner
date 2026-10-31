import { describe, expect, it } from "vitest";
import {
  createKeyBundle,
  decryptRecord,
  encryptRecord,
  generateRecoveryCode,
  isRepetitive,
  recordIdFor,
  replacePassphrase,
  unlockWithPassphrase,
  UnlockFailedError,
  UnreadableRecordError,
  WeakPassphraseError,
  type KeyBundle,
} from "./crypto";

const passphrase = "une phrase de passe assez longue";
const row = { id: "item-1", french: "la réunion", savedAt: "2026-01-02T03:04:05.000Z" };

function setup() {
  const recoveryCode = generateRecoveryCode();
  return createKeyBundle(passphrase, recoveryCode).then((created) => ({ ...created, recoveryCode }));
}

function canonical(code: string) {
  return code.replaceAll("-", "");
}

describe("recovery code", () => {
  it("holds at least 128 bits of entropy in an unambiguous alphabet", () => {
    const code = canonical(generateRecoveryCode());
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
    // Each character of the 32-letter alphabet carries 5 bits.
    expect(code.length * 5).toBeGreaterThanOrEqual(128);
  });

  it("is different every time", () => {
    const codes = new Set(Array.from({ length: 50 }, generateRecoveryCode));
    expect(codes.size).toBe(50);
  });
});

describe("passphrase rules", () => {
  it("refuses a passphrase of fewer than 15 characters", async () => {
    await expect(createKeyBundle("a".repeat(14), generateRecoveryCode())).rejects.toBeInstanceOf(
      WeakPassphraseError,
    );
  });

  it("accepts a passphrase of exactly 15 characters", async () => {
    await expect(createKeyBundle("abcdefghijklmno", generateRecoveryCode())).resolves.toBeDefined();
  });

  it.each([
    ["a single repeated character", "a".repeat(20)],
    ["a short repeated pattern", "abcabcabcabcabc"],
    ["a pattern that stops part way through", "abcdabcdabcdabcdab"],
    ["repeated words", "mot de passe mot de passe "],
    ["a repeated emoji", "😀".repeat(15)],
    ["a repeat hidden in another Unicode form", "ａ".repeat(8) + "a".repeat(8)],
  ])("refuses %s", async (_name, weak) => {
    expect(isRepetitive(weak)).toBe(true);
    await expect(createKeyBundle(weak, generateRecoveryCode())).rejects.toBeInstanceOf(
      WeakPassphraseError,
    );
  });

  it.each([
    ["an ordinary sentence", "le chat dort sur le canapé bleu"],
    ["a repeated start with a different end", "aaaaaaaaaaaaaaaaaaab"],
    ["a long phrase said twice", "une phrase assez longue une phrase assez longue"],
  ])("does not mind %s", (_name, passphrase) => {
    expect(isRepetitive(passphrase)).toBe(false);
  });

  it("counts characters, not UTF-16 units", async () => {
    await expect(createKeyBundle("😀".repeat(14), generateRecoveryCode())).rejects.toBeInstanceOf(
      WeakPassphraseError,
    );
  });
});

describe("key bundle", () => {
  it("derives keys with at least 600,000 PBKDF2 iterations and a separate salt per wrap", async () => {
    const { bundle } = await setup();
    expect(bundle.passphrase.iterations).toBeGreaterThanOrEqual(600_000);
    expect(bundle.recovery.iterations).toBeGreaterThanOrEqual(600_000);
    expect(bundle.passphrase.salt).not.toBe(bundle.recovery.salt);
  });

  it("contains neither secret", async () => {
    const { bundle, recoveryCode } = await setup();
    const text = JSON.stringify(bundle);
    expect(text).not.toContain(passphrase);
    expect(text).not.toContain(canonical(recoveryCode));
  });

  it("gives a second device the same keys from the passphrase alone", async () => {
    const { bundle, keys } = await setup();
    const blob = await encryptRecord(keys, "record", row);

    const secondDevice = await unlockWithPassphrase(bundle, passphrase);

    expect(await decryptRecord(secondDevice, "record", blob)).toEqual(row);
    expect(await recordIdFor(secondDevice, "vocabularyItems", "x")).toBe(
      await recordIdFor(keys, "vocabularyItems", "x"),
    );
  });

  it("unlocks a passphrase typed in either Unicode form", async () => {
    const accented = "une clé très très longue";
    const { bundle } = await createKeyBundle(accented.normalize("NFC"), generateRecoveryCode());

    await expect(unlockWithPassphrase(bundle, accented.normalize("NFD"))).resolves.toBeDefined();
  });

  it("fails cleanly on a wrong passphrase", async () => {
    const { bundle } = await setup();
    await expect(unlockWithPassphrase(bundle, "the wrong passphrase, sorry")).rejects.toBeInstanceOf(
      UnlockFailedError,
    );
  });

  it("unlocks with the recovery code, however it was typed", async () => {
    const { bundle, keys, recoveryCode } = await setup();
    const blob = await encryptRecord(keys, "record", row);

    const typed = ` ${canonical(recoveryCode).toLowerCase().replaceAll("0", "o").replaceAll("1", "l")} `;
    const recovered = await replacePassphrase(bundle, typed, "une toute nouvelle phrase");

    expect(await decryptRecord(recovered.keys, "record", blob)).toEqual(row);
  });

  it("fails cleanly on a wrong recovery code", async () => {
    const { bundle } = await setup();
    await expect(
      replacePassphrase(bundle, generateRecoveryCode(), "une toute nouvelle phrase"),
    ).rejects.toBeInstanceOf(UnlockFailedError);
    await expect(
      replacePassphrase(bundle, "too short", "une toute nouvelle phrase"),
    ).rejects.toBeInstanceOf(UnlockFailedError);
  });

  it("refuses a bundle whose work factor the server has lowered", async () => {
    const { bundle } = await setup();
    const downgraded: KeyBundle = {
      ...bundle,
      passphrase: { ...bundle.passphrase, iterations: 1_000 },
    };
    await expect(unlockWithPassphrase(downgraded, passphrase)).rejects.toBeInstanceOf(
      UnlockFailedError,
    );
  });

  it("does not let one wrap stand in for the other", async () => {
    const { bundle, recoveryCode } = await setup();
    const swapped: KeyBundle = { ...bundle, passphrase: bundle.recovery };
    await expect(unlockWithPassphrase(swapped, canonical(recoveryCode))).rejects.toBeInstanceOf(
      UnlockFailedError,
    );
  });

  it("hands out keys that can never be exported", async () => {
    const { keys } = await setup();
    const unlocked = await unlockWithPassphrase((await setup()).bundle, passphrase);

    for (const key of [keys.dataKey, keys.recordIdKey, unlocked.dataKey, unlocked.recordIdKey]) {
      expect(key.extractable).toBe(false);
      await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
    }
  });
});

describe("recovery rewrap", () => {
  const newPassphrase = "a brand new passphrase for me";

  it("sets a new passphrase and keeps the data key", async () => {
    const { bundle, keys, recoveryCode } = await setup();
    const blob = await encryptRecord(keys, "record", row);

    const rewrapped = await replacePassphrase(bundle, recoveryCode, newPassphrase);

    const unlocked = await unlockWithPassphrase(rewrapped.bundle, newPassphrase);
    expect(await decryptRecord(unlocked, "record", blob)).toEqual(row);
    expect(await decryptRecord(rewrapped.keys, "record", blob)).toEqual(row);
    expect(await recordIdFor(unlocked, "collections", "x")).toBe(
      await recordIdFor(keys, "collections", "x"),
    );
  });

  it("retires the old passphrase but keeps the recovery code working", async () => {
    const { bundle, recoveryCode } = await setup();

    const { bundle: rewrapped } = await replacePassphrase(bundle, recoveryCode, newPassphrase);

    await expect(unlockWithPassphrase(rewrapped, passphrase)).rejects.toBeInstanceOf(
      UnlockFailedError,
    );
    await expect(
      replacePassphrase(rewrapped, recoveryCode, "et encore une autre phrase"),
    ).resolves.toBeDefined();
  });

  it("uses a fresh salt", async () => {
    const { bundle, recoveryCode } = await setup();
    const { bundle: rewrapped } = await replacePassphrase(bundle, recoveryCode, newPassphrase);
    expect(rewrapped.passphrase.salt).not.toBe(bundle.passphrase.salt);
  });

  it("refuses a wrong recovery code and a short new passphrase", async () => {
    const { bundle, recoveryCode } = await setup();
    await expect(
      replacePassphrase(bundle, generateRecoveryCode(), newPassphrase),
    ).rejects.toBeInstanceOf(UnlockFailedError);
    await expect(replacePassphrase(bundle, recoveryCode, "too short")).rejects.toBeInstanceOf(
      WeakPassphraseError,
    );
  });
});

describe("records", () => {
  it("round-trips a record", async () => {
    const { keys } = await setup();
    const blob = await encryptRecord(keys, "record-1", row);
    expect(await decryptRecord(keys, "record-1", blob)).toEqual(row);
  });

  it("uses a fresh IV, so identical plaintext never repeats", async () => {
    const { keys } = await setup();
    const blobs = await Promise.all(
      Array.from({ length: 20 }, () => encryptRecord(keys, "record-1", row)),
    );
    expect(new Set(blobs).size).toBe(20);
  });

  it("leaves no readable text in the blob", async () => {
    const { keys } = await setup();
    const blob = await encryptRecord(keys, "record-1", row);
    expect(blob).not.toContain("réunion");
    expect(atob(blob.replace(/^v1\./, ""))).not.toContain("union");
  });

  it("refuses a blob moved to another record", async () => {
    const { keys } = await setup();
    const blob = await encryptRecord(keys, "record-1", row);
    await expect(decryptRecord(keys, "record-2", blob)).rejects.toBeInstanceOf(
      UnreadableRecordError,
    );
  });

  it("refuses a tampered blob", async () => {
    const { keys } = await setup();
    const blob = await encryptRecord(keys, "record-1", row);
    const bytes = Uint8Array.from(atob(blob.replace(/^v1\./, "")), (c) => c.charCodeAt(0));
    bytes[bytes.length - 1]! ^= 1;
    const tampered = `v1.${btoa(String.fromCharCode(...bytes))}`;
    await expect(decryptRecord(keys, "record-1", tampered)).rejects.toBeInstanceOf(
      UnreadableRecordError,
    );
  });

  it("refuses a blob that is not a blob at all", async () => {
    const { keys } = await setup();
    await expect(decryptRecord(keys, "record-1", "not a blob")).rejects.toBeInstanceOf(
      UnreadableRecordError,
    );
  });

  it("refuses a record encrypted under another Learner's key", async () => {
    const { keys } = await setup();
    const { keys: otherKeys } = await setup();
    const blob = await encryptRecord(otherKeys, "record-1", row);
    await expect(decryptRecord(keys, "record-1", blob)).rejects.toBeInstanceOf(
      UnreadableRecordError,
    );
  });
});

describe("record ids", () => {
  it("are stable and hide the table and row they stand for", async () => {
    const { keys } = await setup();
    const id = await recordIdFor(keys, "vocabularyItems", "useful-expressions/ca-vaut-le-coup");

    expect(await recordIdFor(keys, "vocabularyItems", "useful-expressions/ca-vaut-le-coup")).toBe(id);
    expect(id).not.toMatch(/ca-vaut|vocabulary|useful/i);
    expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("differ by table and by row", async () => {
    const { keys } = await setup();
    const ids = await Promise.all([
      recordIdFor(keys, "collections", "a"),
      recordIdFor(keys, "vocabularyItems", "a"),
      recordIdFor(keys, "collections", "b"),
    ]);
    expect(new Set(ids).size).toBe(3);
  });

  it("cannot be predicted without the Learner's keys", async () => {
    const { keys } = await setup();
    const { keys: otherKeys } = await setup();
    expect(await recordIdFor(keys, "collections", "a")).not.toBe(
      await recordIdFor(otherKeys, "collections", "a"),
    );
  });
});
