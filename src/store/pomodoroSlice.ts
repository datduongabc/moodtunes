import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { clampBreakMin, clampFocusMin, type PendingSession } from '@/domain/pomodoro';
import type { Mood, PomodoroPhase } from '@/domain/types';

export type PomodoroState = {
  phase: PomodoroPhase;
  presetId: string;
  focusMin: number;
  breakMin: number;
  mood: Mood;
  endsAtMs: number | null;
  pausedRemainingSec: number | null;
  /**
   * Completed sessions not yet acknowledged by the server, oldest first. They are persisted, resent
   * when the connection returns, and added to the statistics meanwhile (UC-10 exception 4a).
   */
  pending: PendingSession[];
};

const initialState: PomodoroState = {
  phase: 'idle',
  presetId: 'classic',
  focusMin: 25,
  breakMin: 5,
  mood: 'focused',
  endsAtMs: null,
  pausedRemainingSec: null,
  pending: [],
};

export const pomodoroSlice = createSlice({
  name: 'pomodoro',
  initialState,
  reducers: {
    presetSelected: (s, a: PayloadAction<{ id: string; focusMin: number; breakMin: number }>) => {
      if (s.phase !== 'idle') return;
      s.presetId = a.payload.id;
      s.focusMin = clampFocusMin(a.payload.focusMin);
      s.breakMin = clampBreakMin(a.payload.breakMin);
    },
    customDurationsSet: (s, a: PayloadAction<{ focusMin?: number; breakMin?: number }>) => {
      if (s.phase !== 'idle') return;
      s.presetId = 'custom';
      if (a.payload.focusMin !== undefined) s.focusMin = clampFocusMin(a.payload.focusMin);
      if (a.payload.breakMin !== undefined) s.breakMin = clampBreakMin(a.payload.breakMin);
    },
    moodChanged: (s, a: PayloadAction<Mood>) => {
      s.mood = a.payload;
    },
    started: (s, a: PayloadAction<{ phase: 'focus' | 'break'; endsAtMs: number }>) => {
      s.phase = a.payload.phase;
      s.endsAtMs = a.payload.endsAtMs;
      s.pausedRemainingSec = null;
    },
    paused: (s, a: PayloadAction<number>) => {
      if (s.phase === 'idle' || s.endsAtMs === null) return;
      s.pausedRemainingSec = Math.max(1, a.payload);
      s.endsAtMs = null;
    },
    resumed: (s, a: PayloadAction<number>) => {
      if (s.phase === 'idle' || s.pausedRemainingSec === null) return;
      s.endsAtMs = a.payload;
      s.pausedRemainingSec = null;
    },
    sessionQueued: (s, a: PayloadAction<PendingSession>) => {
      if (!s.pending.some((p) => p.id === a.payload.id)) s.pending.push(a.payload);
    },
    sessionsSent: (s, a: PayloadAction<string[]>) => {
      s.pending = s.pending.filter((p) => !a.payload.includes(p.id));
    },
    pendingRestored: (s, a: PayloadAction<PendingSession[]>) => {
      const ids = new Set(s.pending.map((p) => p.id));
      s.pending = [...a.payload.filter((p) => !ids.has(p.id)), ...s.pending];
    },
    reset: (s) => {
      s.phase = 'idle';
      s.endsAtMs = null;
      s.pausedRemainingSec = null;
    },
    cleared: () => initialState,
  },
});

export const pomodoroActions = pomodoroSlice.actions;
