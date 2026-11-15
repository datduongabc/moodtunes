import {
  BREAK_MIN_MAX,
  BREAK_MIN_MIN,
  clampBreakMin,
  clampFocusMin,
  FOCUS_MIN_MAX,
  FOCUS_MIN_MIN,
  formatTimer,
  nextPhaseOnComplete,
  remainingSeconds,
  dueTransition,
  focusStats,
  newSessionId,
  localDayKey,
  startOfLocalDay,
} from '../pomodoro';

describe('pomodoro domain rules', () => {
  it('clamps focus and break durations within allowed bounds', () => {
    expect(clampFocusMin(1)).toBe(FOCUS_MIN_MIN);
    expect(clampFocusMin(200)).toBe(FOCUS_MIN_MAX);
    expect(clampFocusMin(25.4)).toBe(25);
    expect(clampBreakMin(0)).toBe(BREAK_MIN_MIN);
    expect(clampBreakMin(60)).toBe(BREAK_MIN_MAX);
    expect(clampBreakMin(10)).toBe(10);
  });

  it('computes remaining seconds from target timestamp without negative drift', () => {
    expect(remainingSeconds(null, 1000)).toBe(0);
    expect(remainingSeconds(10_000, 10_500)).toBe(0);
    expect(remainingSeconds(10_500, 10_000)).toBe(1);
    expect(remainingSeconds(70_000, 10_000)).toBe(60);
  });

  it('formats MM:SS including durations over 60 minutes', () => {
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(65)).toBe('01:05');
    expect(formatTimer(25 * 60)).toBe('25:00');
    expect(formatTimer(120 * 60)).toBe('120:00');
  });

  it('transitions focus -> break -> idle on completion', () => {
    expect(nextPhaseOnComplete('focus')).toBe('break');
    expect(nextPhaseOnComplete('break')).toBe('idle');
    expect(nextPhaseOnComplete('idle')).toBe('idle');
  });
});

describe('dueTransition', () => {
  it('returns null while idle, paused or still counting down', () => {
    expect(dueTransition({ phase: 'idle', endsAtMs: null }, 5_000)).toBeNull();
    expect(dueTransition({ phase: 'focus', endsAtMs: null }, 5_000)).toBeNull();
    expect(dueTransition({ phase: 'focus', endsAtMs: 5_001 }, 5_000)).toBeNull();
  });

  it('reports the end of focus and of break once the target time has passed', () => {
    expect(dueTransition({ phase: 'focus', endsAtMs: 5_000 }, 5_000)).toBe('focusDone');
    // the app may only notice the deadline long after it passed, e.g. when it returns from the background
    expect(dueTransition({ phase: 'focus', endsAtMs: 5_000 }, 3_600_000)).toBe('focusDone');
    expect(dueTransition({ phase: 'break', endsAtMs: 5_000 }, 6_000)).toBe('breakDone');
  });
});

describe('localDay', () => {
  it('starts at local midnight and keys the same calendar day identically', () => {
    const noon = new Date(2026, 10, 15, 12, 30).getTime();
    const start = startOfLocalDay(noon);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(15);
    expect(localDayKey(noon)).toBe('2026-11-15');
    expect(localDayKey(new Date(2026, 10, 15, 0, 5).getTime())).toBe('2026-11-15');
    expect(localDayKey(new Date(2026, 10, 15, 23, 59).getTime())).toBe('2026-11-15');
    expect(localDayKey(new Date(2026, 10, 16, 0, 0).getTime())).toBe('2026-11-16');
  });
});

describe('focusStats', () => {
  const now = new Date(2026, 10, 15, 9).getTime();
  const pending = (focusMin: number, completedAt: number) => ({
    id: String(completedAt),
    focusMin,
    breakMin: 5,
    mood: 'focused' as const,
    completedAt,
  });

  it('adds sessions not yet acknowledged by the server; only today counts for today', () => {
    const server = { totalSessions: 4, totalFocusMinutes: 100, todayFocusMinutes: 25 };
    const out = focusStats(server, [pending(25, now - 60_000), pending(50, new Date(2026, 10, 14, 22).getTime())], now);
    expect(out).toEqual({ totalSessions: 6, totalFocusMinutes: 175, todayFocusMinutes: 50 });
  });

  it('works before the first server response', () => {
    expect(focusStats(undefined, [], now)).toEqual({ totalSessions: 0, totalFocusMinutes: 0, todayFocusMinutes: 0 });
  });
});

describe('newSessionId', () => {
  it('produces distinct RFC 4122 version 4 identifiers', () => {
    const ids = new Set(Array.from({ length: 200 }, newSessionId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
