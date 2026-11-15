import { useMemo, useState } from 'react';
import { moodShares, startOfLocalMonth, startOfLocalWeek } from '@/domain/stats';
import type { ViewState } from '@/domain/types';
import { useClock } from './useClock';
import { useDiaryEntries } from './useDiary';

export type StatsPeriod = 'week' | 'month';

/** View model for the mood statistics screen (FR-14), computed on the device from the diary tags. */
export function useMoodStats() {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { entries, q, online } = useDiaryEntries();
  const now = useClock();
  const since = (period === 'week' ? startOfLocalWeek(now) : startOfLocalMonth(now)).getTime();
  const shares = useMemo(() => moodShares(entries, since), [entries, since]);
  const total = shares.reduce((a, s) => a + s.count, 0);

  let state: ViewState;
  if (q.isLoading && entries.length === 0) state = 'loading';
  else if (q.isError && entries.length === 0) state = online ? 'error' : 'offline';
  else state = shares.length === 0 ? 'empty' : 'success';

  return { period, setPeriod, shares, total, state, retry: () => void q.refetch() };
}
