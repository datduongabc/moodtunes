import type { ListeningContext, Mood } from './types';

/** A pending tag change (A01 table 6.3). One row per song and mood; the newest change wins (AC-10.1.4). */
export type OutboxChange = {
  songId: number;
  mood: Mood;
  op: 'put' | 'delete';
  note: string | null;
  context: ListeningContext | null;
  createdAt: number;
  attempts: number;
};

export const outboxKey = (songId: number, mood: Mood) => `${songId}:${mood}`;

export function mergeChange(queue: OutboxChange[], change: Omit<OutboxChange, 'attempts'>): OutboxChange[] {
  const rest = queue.filter((c) => !(c.songId === change.songId && c.mood === change.mood));
  return [...rest, { ...change, attempts: 0 }].sort((a, b) => a.createdAt - b.createdAt);
}

/** Retry delay after a failed attempt: 2, 4, 8 ... seconds, at most 60 s. */
export const backoffMs = (attempts: number, retryAfterSec?: number) =>
  retryAfterSec ? retryAfterSec * 1000 : Math.min(60_000, 1000 * 2 ** Math.max(1, attempts));
