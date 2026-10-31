import { useEffect, useState } from 'react';
import type { ViewState } from '@/domain/types';
import { useSongsQuery } from '@/data/remote/api';
import { useAppSelector } from '@/store';
import { playSongs } from '@/store/services';

export const SEARCH_DEBOUNCE_MS = 300;

/** View model for SCR-06 Library and search (UC-06, AC-02.1.*). */
export function useLibrary() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
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

  const res = useSongsQuery({ q: query, offset });
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
    items,
    total,
    state,
    currentId,
    loadingMore: res.isFetching && offset > 0,
    loadMore: () => {
      if (!res.isFetching && items.length < total) setOffset(items.length);
    },
    retry: () => void res.refetch(),
    clear: () => setText(''),
    play: (i: number) => playSongs(items, i, query ? `Search: ${query}` : 'Library'),
  };
}
