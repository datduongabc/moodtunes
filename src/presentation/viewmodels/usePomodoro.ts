import { useEffect, useState } from 'react';
import { moodInfo } from '@/domain/moods';
import { formatTimer, remainingSeconds } from '@/domain/pomodoro';
import type { Mood } from '@/domain/types';
import { PlayerService } from '@/data/player/PlayerService';
import { useLazyRecommendationsQuery } from '@/data/remote/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { pomodoroActions } from '@/store/pomodoroSlice';
import { checkPomodoro, playSongs } from '@/store/services';
import { uiActions } from '@/store/uiSlice';
import { usePomodoroStats } from './usePomodoroStats';

/**
 * View model for the Pomodoro Focus + Music tab. Phase transitions are applied by
 * `checkPomodoro` in the store services so they also happen in the background; this hook only
 * redraws the countdown and triggers the same check while the screen is visible.
 */
export function usePomodoro() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.pomodoro);
  const stats = usePomodoroStats();
  const [fetchRecs, recsState] = useLazyRecommendationsQuery();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.endsAtMs === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      checkPomodoro(t);
    }, 500);
    return () => clearInterval(id);
  }, [state.endsAtMs]);

  const activeSec =
    state.phase === 'idle'
      ? state.focusMin * 60
      : state.pausedRemainingSec !== null
        ? state.pausedRemainingSec
        : remainingSeconds(state.endsAtMs, now);

  const startFocus = async () => {
    dispatch(
      pomodoroActions.started({
        phase: 'focus',
        endsAtMs: Date.now() + state.focusMin * 60_000,
      }),
    );
    try {
      const res = await fetchRecs({ mood: state.mood, context: 'study' }, true).unwrap();
      if (res.items.length > 0) {
        await playSongs(
          res.items.map((i) => i.song),
          0,
          `${moodInfo(state.mood).label} Focus`,
        );
      }
    } catch {
      dispatch(uiActions.snack('Timer started. Connect to load focus music'));
    }
  };

  const pause = () => {
    dispatch(pomodoroActions.paused(activeSec));
    if (state.phase === 'focus') PlayerService.pause();
  };

  const resume = () => {
    if (state.pausedRemainingSec === null) return;
    dispatch(pomodoroActions.resumed(Date.now() + state.pausedRemainingSec * 1000));
    if (state.phase === 'focus') void PlayerService.play();
  };

  const reset = () => {
    dispatch(pomodoroActions.reset());
    PlayerService.pause();
  };

  const skipToBreak = () => {
    PlayerService.pause();
    dispatch(
      pomodoroActions.started({
        phase: 'break',
        endsAtMs: Date.now() + state.breakMin * 60_000,
      }),
    );
  };

  return {
    phase: state.phase,
    presetId: state.presetId,
    focusMin: state.focusMin,
    breakMin: state.breakMin,
    mood: state.mood,
    isPaused: state.phase !== 'idle' && state.pausedRemainingSec !== null,
    timeText: formatTimer(activeSec),
    startingMusic: recsState.isFetching,
    todayFocusMinutes: stats.todayFocusMinutes,
    totalSessions: stats.totalSessions,
    selectPreset: (id: string, focusMin: number, breakMin: number) =>
      dispatch(pomodoroActions.presetSelected({ id, focusMin, breakMin })),
    setCustomFocus: (focusMin: number) => dispatch(pomodoroActions.customDurationsSet({ focusMin })),
    setCustomBreak: (breakMin: number) => dispatch(pomodoroActions.customDurationsSet({ breakMin })),
    setMood: (m: Mood) => dispatch(pomodoroActions.moodChanged(m)),
    startFocus,
    pause,
    resume,
    reset,
    skipToBreak,
  };
}
