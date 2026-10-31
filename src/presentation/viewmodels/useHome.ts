import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo } from 'react';
import { moodInfo } from '@/domain/moods';
import { demoteRecentlyPlayed } from '@/domain/recommendations';
import type { ViewState } from '@/domain/types';
import { useRecommendationsQuery } from '@/data/remote/api';
import { useAppSelector } from '@/store';
import { playSongs } from '@/store/services';
import { useClock } from './useClock';

/** View model for SCR-05 Home (UC-03, FR-06). */
export function useHome() {
  const mood = useAppSelector((s) => s.mood.current);
  const context = useAppSelector((s) => s.mood.context);
  const playedAt = useAppSelector((s) => s.player.playedAt);
  const online = useAppSelector((s) => s.network.online);
  const currentId = useAppSelector((s) => s.player.queue[s.player.index]?.id);
  const now = useClock();
  const q = useRecommendationsQuery(mood ? { mood, context } : skipToken, { refetchOnMountOrArgChange: 30 * 60 });

  const items = useMemo(
    () => (q.data ? demoteRecentlyPlayed(q.data.items, playedAt, now) : []),
    [q.data, playedAt, now],
  );

  let state: ViewState;
  if (!mood) state = 'empty';
  else if (q.isLoading) state = 'loading';
  else if (q.isError) state = online ? 'error' : 'offline';
  else state = items.length === 0 ? 'empty' : 'success';

  return {
    mood,
    context,
    state,
    items,
    currentId,
    isSample: q.data?.isSample ?? false,
    fromCache: q.data?.fromCache ?? false,
    retry: q.refetch,
    play: (index: number) =>
      playSongs(
        items.map((i) => i.song),
        index,
        mood ? `${moodInfo(mood).label} mix` : 'Recommendations',
      ),
  };
}
