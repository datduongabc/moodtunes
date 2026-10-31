/**
 * Listening battery (FR-08). Listening time is derived from play/pause timestamps,
 * never from a running timer (AC-08.1.5, NFR-BAT-01).
 */
export type BatteryState = {
  date: string; // local date YYYY-MM-DD
  listenedMs: number; // completed listening time today
  playingSince: number | null; // epoch ms when the current playing period started
  goalMin: number;
  warned20: boolean;
  warned0: boolean;
};

export const GOAL_MIN = 30;
export const GOAL_MAX = 480;
export const GOAL_STEP = 15;
export const GOAL_DEFAULT = 120;

export const localDate = (t: number): string => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const startOfLocalDay = (t: number): number => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const isValidGoal = (min: number) =>
  Number.isInteger(min) && min >= GOAL_MIN && min <= GOAL_MAX && min % GOAL_STEP === 0;

export const initialBattery = (now: number, goalMin = GOAL_DEFAULT): BatteryState => ({
  date: localDate(now),
  listenedMs: 0,
  playingSince: null,
  goalMin,
  warned20: false,
  warned0: false,
});

/** Resets the battery at local midnight (AC-08.1.4). A playing period that crosses midnight counts from 00:00. */
export function rollOver(s: BatteryState, now: number): BatteryState {
  if (s.date === localDate(now)) return s;
  return {
    ...initialBattery(now, s.goalMin),
    playingSince: s.playingSince === null ? null : Math.max(s.playingSince, startOfLocalDay(now)),
  };
}

export function onPlay(s: BatteryState, now: number): BatteryState {
  const r = rollOver(s, now);
  return r.playingSince === null ? { ...r, playingSince: now } : r;
}

/** Called on pause, stop or buffering (AC-08.1.1). */
export function onPause(s: BatteryState, now: number): BatteryState {
  const r = rollOver(s, now);
  if (r.playingSince === null) return r;
  return { ...r, listenedMs: r.listenedMs + Math.max(0, now - r.playingSince), playingSince: null };
}

export function listenedMs(s: BatteryState, now: number): number {
  const r = rollOver(s, now);
  return r.listenedMs + (r.playingSince === null ? 0 : Math.max(0, now - r.playingSince));
}

/** Remaining battery from 0 to 100. */
export function remainingPercent(s: BatteryState, now: number): number {
  const goalMs = s.goalMin * 60_000;
  const left = 1 - listenedMs(s, now) / goalMs;
  return Math.round(Math.min(1, Math.max(0, left)) * 100);
}

/** Returns the banner to show once for each threshold (AC-08.1.3) and the updated flags. */
export function checkThresholds(s: BatteryState, now: number): { state: BatteryState; banner: 'low' | 'empty' | null } {
  const r = rollOver(s, now);
  const pct = remainingPercent(r, now);
  if (pct <= 0 && !r.warned0) return { state: { ...r, warned0: true, warned20: true }, banner: 'empty' };
  if (pct <= 20 && !r.warned20) return { state: { ...r, warned20: true }, banner: 'low' };
  return { state: r, banner: null };
}
