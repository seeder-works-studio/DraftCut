import { getDB } from './db';

export async function saveAPIKey(
  provider: string,
  key: string
): Promise<void> {
  const db = await getDB();
  await db.put('settings', key, `api-key-${provider}`);
}

export async function loadAPIKey(
  provider: string
): Promise<string | null> {
  const db = await getDB();
  const val = await db.get('settings', `api-key-${provider}`);
  return (val as string) || null;
}

export async function clearAPIKey(provider: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', `api-key-${provider}`);
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function loadSetting(key: string): Promise<string | null> {
  const db = await getDB();
  const val = await db.get('settings', key);
  return (val as string) || null;
}
