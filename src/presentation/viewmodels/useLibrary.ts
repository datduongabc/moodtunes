import { useEffect, useState } from 'react';
import { moodInfo } from '@/domain/moods';
import type { Mood, ViewState } from '@/domain/types';
import { useSongsQuery } from '@/data/remote/api';
import { useAppSelector } from '@/store';
import { playSongs } from '@/store/services';

export const SEARCH_DEBOUNCE_MS = 300;

/** View model for SCR-06 Library and search (UC-06, AC-02.1.*). */
export function useLibrary() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [mood, setMoodState] = useState<Mood | null>(null);
  const online = useAppSelector((s) => s.network.online);
  const currentId = useAppSelector((s) => s.player.queue[s.player.index]?.id);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = text.trim().length >= 2 ? text.trim() : '';
      setQuery(q);
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text]);

  const res = useSongsQuery({ q: query, offset, mood });
  const items = res.data?.items ?? [];
  const total = res.data?.total ?? 0;

  let state: ViewState;
  if (res.isLoading || (res.isFetching && offset === 0 && items.length === 0)) state = 'loading';
  else if (res.isError && items.length === 0) state = online ? 'error' : 'offline';
  else state = items.length === 0 ? 'empty' : 'success';

  return {
    text,
    setText,
    query,
    mood,
    /** Tapping the selected mood again clears the filter (FR-18). */
    toggleMood: (m: Mood) => {
      setMoodState((cur) => (cur === m ? null : m));
      setOffset(0);
    },
    items,
    total,
    state,
    currentId,
    loadingMore: res.isFetching && offset > 0,
    loadMore: () => {
      if (!res.isFetching && items.length < total) setOffset(items.length);
    },
    retry: () => void res.refetch(),
    clear: () => {
      setText('');
      setMoodState(null);
      setOffset(0);
    },
    play: (i: number) =>
      playSongs(
        items,
        i,
        [query ? `Search: ${query}` : 'Library', mood ? moodInfo(mood).label : null].filter(Boolean).join(' · '),
      ),
  };
}
