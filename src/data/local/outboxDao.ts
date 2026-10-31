import type { OutboxChange } from '@/domain/outbox';
import type { ListeningContext, Mood } from '@/domain/types';
import { getDb } from './db';

type Row = {
  song_id: number;
  mood_code: string;
  op: 'put' | 'delete';
  note: string | null;
  context: string | null;
  created_at: number;
  attempts: number;
};

const toChange = (r: Row): OutboxChange => ({
  songId: r.song_id,
  mood: r.mood_code as Mood,
  op: r.op,
  note: r.note,
  context: r.context as ListeningContext | null,
  createdAt: r.created_at,
  attempts: r.attempts,
});

/** Inserting replaces any earlier change for the same song and mood (AC-10.1.4). */
export async function enqueue(change: Omit<OutboxChange, 'attempts'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO outbox (song_id, mood_code, op, note, context, created_at, attempts) VALUES (?, ?, ?, ?, ?, ?, 0)',
    change.songId,
    change.mood,
    change.op,
    change.note,
    change.context,
    change.createdAt,
  );
}

export async function listPending(): Promise<OutboxChange[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM outbox ORDER BY created_at');
  return rows.map(toChange);
}

/** Removes the change only if it was not replaced while the request was in flight. */
export async function remove(change: OutboxChange): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM outbox WHERE song_id = ? AND mood_code = ? AND created_at = ?',
    change.songId,
    change.mood,
    change.createdAt,
  );
}

export async function markAttempt(change: OutboxChange): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE outbox SET attempts = attempts + 1 WHERE song_id = ? AND mood_code = ? AND created_at = ?',
    change.songId,
    change.mood,
    change.createdAt,
  );
}
