import type { Recommendation } from './types';

export const RECENT_PLAY_MS = 2 * 60 * 60_000;

/** Songs played in the last two hours are placed after all other songs (AC-06.1.3). Stable otherwise. */
export function demoteRecentlyPlayed(
  items: Recommendation[],
  playedAt: Record<number, number>,
  now: number,
): Recommendation[] {
  const recent = (id: number) => playedAt[id] !== undefined && now - playedAt[id] < RECENT_PLAY_MS;
  return [...items.filter((i) => !recent(i.song.id)), ...items.filter((i) => recent(i.song.id))];
}
