import { db } from "./db";

/** Undefined until the setting has been saved, on this device or another. */
export async function getSetting<T>(id: string): Promise<T | undefined> {
  const row = await db.settings.get(id);
  return row?.value as T | undefined;
}

export async function setSetting(id: string, value: unknown) {
  await db.settings.put({ id, value, savedAt: new Date().toISOString() });
}
