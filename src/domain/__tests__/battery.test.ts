import {
  checkThresholds,
  initialBattery,
  isValidGoal,
  listenedMs,
  onPause,
  onPlay,
  remainingPercent,
  rollOver,
} from '../battery';

const at = (h: number, m = 0, day = 10) => new Date(2026, 10, day, h, m, 0, 0).getTime();
const MIN = 60_000;

describe('listening battery (FR-08)', () => {
  it('counts time only between play and pause (AC-08.1.1)', () => {
    let s = initialBattery(at(9), 120);
    s = onPlay(s, at(9));
    s = onPause(s, at(9, 10));
    s = onPlay(s, at(9, 30));
    expect(listenedMs(s, at(9, 35))).toBe(15 * MIN);
    s = onPause(s, at(9, 40));
    expect(listenedMs(s, at(11))).toBe(20 * MIN);
  });

  it('counts listening with the screen locked from timestamps, not a timer (AC-08.1.5)', () => {
    const s = onPlay(initialBattery(at(20), 120), at(20));
    expect(listenedMs(s, at(20, 10))).toBe(10 * MIN);
  });

  it('ignores a second play event while already playing', () => {
    const s = onPlay(onPlay(initialBattery(at(8)), at(8)), at(8, 5));
    expect(s.playingSince).toBe(at(8));
  });

  it('accepts goals from 30 min to 8 h in 15-minute steps (AC-08.1.2)', () => {
    expect(isValidGoal(30)).toBe(true);
    expect(isValidGoal(480)).toBe(true);
    expect(isValidGoal(135)).toBe(true);
    expect(isValidGoal(15)).toBe(false);
    expect(isValidGoal(495)).toBe(false);
    expect(isValidGoal(100)).toBe(false);
    expect(initialBattery(at(8)).goalMin).toBe(120);
  });

  it('computes the remaining percentage', () => {
    const s = onPause(onPlay(initialBattery(at(8), 100), at(8)), at(8, 80));
    expect(remainingPercent(s, at(9))).toBe(20);
    expect(remainingPercent(onPause(onPlay(s, at(9)), at(10)), at(10))).toBe(0);
  });

  it('shows each threshold banner once (AC-08.1.3)', () => {
    let s = onPause(onPlay(initialBattery(at(8), 100), at(8)), at(8, 80));
    const first = checkThresholds(s, at(8, 81));
    expect(first.banner).toBe('low');
    s = first.state;
    expect(checkThresholds(s, at(8, 82)).banner).toBeNull();
    s = onPause(onPlay(s, at(9)), at(9, 30));
    const empty = checkThresholds(s, at(9, 31));
    expect(empty.banner).toBe('empty');
    expect(checkThresholds(empty.state, at(9, 40)).banner).toBeNull();
  });

  it('resets at local midnight (AC-08.1.4)', () => {
    const s = onPause(onPlay(initialBattery(at(22), 120), at(22)), at(23));
    const next = rollOver(s, at(0, 5, 11));
    expect(next.listenedMs).toBe(0);
    expect(next.goalMin).toBe(120);
    expect(next.warned20).toBe(false);
  });

  it('counts a playing period that crosses midnight from 00:00', () => {
    const s = onPlay(initialBattery(at(23, 50), 120), at(23, 50));
    expect(listenedMs(s, at(0, 10, 11))).toBe(10 * MIN);
  });
});
