import { startOfLocalDay } from '@/domain/day';
import { focusStats } from '@/domain/pomodoro';
import { usePomodoroStatsQuery } from '@/data/remote/api';
import { useAppSelector } from '@/store';
import { useClock } from './useClock';

/**
 * Focus statistics for the Focus tab and Profile: the server's figures for the listener's local
 * day, plus completed sessions that are still waiting to be sent.
 */
export function usePomodoroStats() {
  const now = useClock(); // re-keys the query when the local day changes
  const { data } = usePomodoroStatsQuery({ todayStart: startOfLocalDay(now).toISOString() });
  const pending = useAppSelector((s) => s.pomodoro.pending);
  return focusStats(data, pending, now);
}
