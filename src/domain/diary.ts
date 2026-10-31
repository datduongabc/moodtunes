import type { DiaryEntry, Mood } from './types';

export type DiaryDay = { day: string; entries: DiaryEntry[] };

/** Groups tags by local day, most recent first (AC-07.1.1); optional mood filter (AC-07.1.2). */
export function groupByDay(entries: DiaryEntry[], filter: Mood | null = null): DiaryDay[] {
  const sorted = entries
    .filter((e) => filter === null || e.mood === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const days: DiaryDay[] = [];
  for (const e of sorted) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const last = days[days.length - 1];
    if (last && last.day === key) last.entries.push(e);
    else days.push({ day: key, entries: [e] });
  }
  return days;
}
