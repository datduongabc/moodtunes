import type { Mood, PomodoroPhase } from './types';

export const FOCUS_MIN_MIN = 5;
export const FOCUS_MIN_MAX = 120;
export const BREAK_MIN_MIN = 1;
export const BREAK_MIN_MAX = 30;
export const DURATION_STEP = 5;

export type PomodoroPreset = { id: string; label: string; focusMin: number; breakMin: number };

export const POMODORO_PRESETS: PomodoroPreset[] = [
  { id: 'classic', label: '25 / 5', focusMin: 25, breakMin: 5 },
  { id: 'deep', label: '50 / 10', focusMin: 50, breakMin: 10 },
];

export const clampFocusMin = (min: number) => Math.max(FOCUS_MIN_MIN, Math.min(FOCUS_MIN_MAX, Math.round(min)));
export const clampBreakMin = (min: number) => Math.max(BREAK_MIN_MIN, Math.min(BREAK_MIN_MAX, Math.round(min)));

/** Remaining whole seconds from a target timestamp, clamped at zero. */
export function remainingSeconds(endsAtMs: number | null, nowMs: number): number {
  if (endsAtMs === null) return 0;
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

/** Formats seconds as MM:SS (supports > 60 minutes, e.g. 120:00). */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Next phase when the current active timer reaches 0. */
export function nextPhaseOnComplete(phase: PomodoroPhase): PomodoroPhase {
  if (phase === 'focus') return 'break';
  return 'idle';
}

export type PomodoroTransition = 'focusDone' | 'breakDone';

/**
 * Which transition is due, if any. The deadline is checked against wall-clock time rather than
 * counted down tick by tick, so a check that runs late (after the app returns from the
 * background) still fires exactly once and in the right phase.
 */
export function dueTransition(
  s: { phase: PomodoroPhase; endsAtMs: number | null },
  nowMs: number,
): PomodoroTransition | null {
  if (s.phase === 'idle' || s.endsAtMs === null || nowMs < s.endsAtMs) return null;
  return s.phase === 'focus' ? 'focusDone' : 'breakDone';
}

/** Local midnight of the day containing `nowMs`; "today" in the statistics is the listener's day, not UTC. */
export function startOfLocalDay(nowMs: number): Date {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" of the local calendar day, used to reset the on-device counters at midnight. */
export function localDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A completed focus session that the server has not acknowledged yet. */
export type PendingSession = {
  /** Client-generated, so that resending after a lost response cannot record the session twice. */
  id: string;
  focusMin: number;
  breakMin: number;
  mood: Mood | null;
  completedAt: number;
};

export type FocusStats = { totalSessions: number; totalFocusMinutes: number; todayFocusMinutes: number };

/** Server statistics plus the sessions still waiting to be sent, so offline focus time is shown at once. */
export function focusStats(
  server: FocusStats | undefined,
  pending: readonly PendingSession[],
  nowMs: number,
): FocusStats {
  const today = localDayKey(nowMs);
  let sessions = server?.totalSessions ?? 0;
  let total = server?.totalFocusMinutes ?? 0;
  let todayMin = server?.todayFocusMinutes ?? 0;
  for (const p of pending) {
    sessions += 1;
    total += p.focusMin;
    if (localDayKey(p.completedAt) === today) todayMin += p.focusMin;
  }
  return { totalSessions: sessions, totalFocusMinutes: total, todayFocusMinutes: todayMin };
}

/**
 * UUID version 4 used as an idempotency key. Hermes has no `crypto.randomUUID`; `Math.random` is
 * enough here because the identifier only has to be unique per listener, not unguessable.
 */
export function newSessionId(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16));
  hex[12] = 4;
  hex[16] = (hex[16] & 0x3) | 0x8;
  const s = hex.map((n) => n.toString(16)).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
