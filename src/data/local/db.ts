import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS outbox (
  song_id INTEGER NOT NULL,
  mood_code TEXT NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('put','delete')),
  note TEXT,
  context TEXT,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (song_id, mood_code)
);
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/** Local database (A01 table 6.3). Personal tables are wiped at sign-out (AC-01.2.2). */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('moodtunes.db');
      await db.execAsync(SCHEMA);
      return db;
    })();
  }
  return dbPromise;
}

export async function clearPersonalData(): Promise<void> {
  const db = await getDb();
  // device-level settings such as the onboarding flag are kept
  await db.execAsync("DELETE FROM outbox; DELETE FROM cache; DELETE FROM kv WHERE key NOT LIKE 'device:%';");
}
