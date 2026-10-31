import { getDb } from './db';

/** Cached server data (AC-10.1.5). Stale entries are still shown offline with their timestamp. */
export type Cached<T> = { data: T; updatedAt: number };

export const cacheKeys = {
  chart: (mood: string) => `chart:${mood}`,
  recs: (mood: string, context: string | null) => `recs:${mood}:${context ?? '-'}`,
  diary: () => 'diary',
  recentSongs: () => 'recent-songs',
};

export const FRESH_MS = { chart: 15 * 60_000, recs: 30 * 60_000 };
const MAX_ENTRIES = 200;

export async function cacheGet<T>(key: string): Promise<Cached<T> | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string; updated_at: number }>(
    'SELECT json, updated_at FROM cache WHERE key = ?',
    key,
  );
  return row ? { data: JSON.parse(row.json) as T, updatedAt: row.updated_at } : null;
}

export async function cachePut(key: string, data: unknown, now = Date.now()): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO cache (key, json, updated_at) VALUES (?, ?, ?)',
    key,
    JSON.stringify(data),
    now,
  );
  // least-recently-updated eviction keeps the cache small (NFR-OFF-02)
  await db.runAsync(
    'DELETE FROM cache WHERE key NOT IN (SELECT key FROM cache ORDER BY updated_at DESC LIMIT ?)',
    MAX_ENTRIES,
  );
}
