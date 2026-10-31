import { useMemo, useState } from 'react';
import { hhmm } from '@/core/time';
import { groupByDay } from '@/domain/diary';
import { MOOD_CODES, type DiaryEntry, type Mood, type Song, type ViewState } from '@/domain/types';
import { useDiaryQuery } from '@/data/remote/api';
import { useAppSelector } from '@/store';

const dayLabel = (key: string, now = new Date()) => {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (key === fmt(now)) return 'Today';
  if (key === fmt(y)) return 'Yesterday';
  const [yy, mm, dd] = key.split('-').map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

/** View model for SCR-11 Diary (UC-07, FR-07). Pending local tags are merged in (AC-07.1.3). */
export function useDiary() {
  const [filter, setFilter] = useState<Mood | null>(null);
  const q = useDiaryQuery();
  const online = useAppSelector((s) => s.network.online);
  const local = useAppSelector((s) => s.tags.bySong);
  const recent = useAppSelector((s) => s.player.recent);
  const queue = useAppSelector((s) => s.player.queue);

  const entries = useMemo(() => {
    const server = q.data?.entries ?? [];
    const songs = new Map<number, Song>();
    for (const s of [...recent, ...queue]) songs.set(s.id, s);
    for (const e of server) songs.set(e.songId, e.song);
    const out: DiaryEntry[] = [];
    const seen = new Set<string>();
    for (const e of server) {
      const l = local[e.songId]?.[e.mood];
      if (local[e.songId] && !l) continue; // removed locally, waiting to sync
      seen.add(`${e.songId}:${e.mood}`);
      out.push(l ? { ...e, note: l.note, pending: l.pending } : e);
    }
    for (const [id, moods] of Object.entries(local)) {
      for (const m of MOOD_CODES) {
        const t = moods?.[m];
        const song = songs.get(Number(id));
        if (t?.pending && song && !seen.has(`${id}:${m}`)) {
          out.push({
            songId: Number(id),
            mood: m,
            context: t.context,
            note: t.note,
            createdAt: t.createdAt,
            song,
            pending: true,
          });
        }
      }
    }
    return out;
  }, [q.data, local, recent, queue]);

  const days = useMemo(
    () => groupByDay(entries, filter).map((d) => ({ ...d, label: dayLabel(d.day) })),
    [entries, filter],
  );

  let state: ViewState;
  if (q.isLoading && entries.length === 0) state = 'loading';
  else if (q.isError && entries.length === 0) state = online ? 'error' : 'offline';
  else state = entries.length === 0 ? 'empty' : 'success';

  return {
    filter,
    setFilter,
    days,
    state,
    filteredEmpty: state === 'success' && days.length === 0,
    offlineText: q.data?.fromCache ? `You're offline. Showing your diary from ${hhmm(q.data.updatedAt)}` : null,
    refreshing: q.isFetching && !q.isLoading,
    refresh: () => void q.refetch(),
  };
}
