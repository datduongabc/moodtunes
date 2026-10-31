import { useEffect } from 'react';
import { listenedMs, remainingPercent } from '@/domain/battery';
import { minutesLabel } from '@/core/time';
import { useAppSelector } from '@/store';
import { tickClock, useClock } from './useClock';

/** View model for the battery card and SCR-12 (FR-08). */
export function useBattery() {
  const state = useAppSelector((s) => s.battery);
  const now = useClock();
  useEffect(() => {
    tickClock(); // refresh the time whenever the battery state changes (play, pause, goal)
  }, [state]);

  const listenedMin = Math.floor(listenedMs(state, now) / 60_000);
  const leftMin = Math.max(0, state.goalMin - listenedMin);
  const percent = remainingPercent(state, now);
  const level: 'normal' | 'low' | 'empty' = percent <= 0 ? 'empty' : percent <= 20 ? 'low' : 'normal';
  return {
    percent,
    level,
    goalMin: state.goalMin,
    listenedMin,
    leftMin,
    cardText:
      level === 'empty' ? 'Daily goal reached' : `${minutesLabel(leftMin)} left of ${minutesLabel(state.goalMin)}`,
  };
}
