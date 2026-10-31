import { useState } from 'react';
import { hhmm, nextQuarterHour } from '@/core/time';
import { moodInfo } from '@/domain/moods';
import type { Mood, ViewState } from '@/domain/types';
import { useChartQuery } from '@/data/remote/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { playSongs, toggleTag } from '@/store/services';
import { uiActions } from '@/store/uiSlice';

/** View model for SCR-10 Charts (UC-09, FR-09). */
export function useCharts() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.mood.current);
  const [mood, setMood] = useState<Mood>(current ?? 'happy');
  const online = useAppSelector((s) => s.network.online);
  const myTags = useAppSelector((s) => s.tags.bySong);
  const q = useChartQuery(mood, { refetchOnMountOrArgChange: 15 * 60 });
  const entries = q.data?.entries ?? [];

  let state: ViewState;
  if (q.isLoading) state = 'loading';
  else if (q.isError) state = online ? 'error' : 'offline';
  else state = entries.length === 0 ? 'empty' : 'success';

  const voted = (songId: number, serverVote: boolean) => {
    const local = myTags[songId];
    return local ? !!local[mood] : serverVote;
  };

  return {
    mood,
    setMood,
    label: moodInfo(mood).label,
    state,
    entries,
    isSample: q.data?.isSample ?? false,
    updatedText: q.data?.computedAt ? `Updated ${hhmm(q.data.computedAt)}` : null,
    offlineText: q.data?.fromCache ? `You're offline. Showing the chart from ${hhmm(q.data.updatedAt)}` : null,
    refreshing: q.isFetching && !q.isLoading,
    refresh: () => void q.refetch(),
    voted,
    vote: async (songId: number, serverVote: boolean) => {
      const on = await toggleTag(songId, mood, { forceOn: !voted(songId, serverVote) });
      if (on) dispatch(uiActions.snack(`Vote saved. Rankings update at ${hhmm(nextQuarterHour(Date.now()))}`));
    },
    playAll: (from = 0) =>
      playSongs(
        entries.map((e) => e.song),
        from,
        `Top ${moodInfo(mood).label}`,
      ),
  };
}
