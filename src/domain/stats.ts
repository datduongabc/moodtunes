import type { Mood } from './types';

/** Monday 00:00 local time of the week containing `nowMs` (ISO 8601 weeks, as used in Vietnam). */
export function startOfLocalWeek(nowMs: number): Date {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d;
}

export function startOfLocalMonth(nowMs: number): Date {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export type MoodShare = { mood: Mood; count: number; share: number };

/** Share of each mood among the listener's own tags since `sinceMs`, largest first (FR-14). */
export function moodShares(tags: readonly { mood: Mood; createdAt: string }[], sinceMs: number): MoodShare[] {
  const counts = new Map<Mood, number>();
  for (const t of tags) {
    if (Date.parse(t.createdAt) >= sinceMs) counts.set(t.mood, (counts.get(t.mood) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .map(([mood, count]) => ({ mood, count, share: count / total }))
    .sort((a, b) => b.count - a.count || a.mood.localeCompare(b.mood));
}
