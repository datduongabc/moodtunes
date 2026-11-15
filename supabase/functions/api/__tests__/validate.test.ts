// Pure validators of the Edge Function, run with Jest because they have no Deno-specific imports.
import {
  isBreakMin,
  isContext,
  isFocusMin,
  isMood,
  isUuid,
  parseCompletedAt,
  parseId,
  parseTodayStart,
} from '../validate';

const NOW = Date.parse('2026-11-15T03:00:00Z');
const HOUR = 3_600_000;

describe('vocabularies and identifiers', () => {
  it('accepts only the fixed moods and contexts', () => {
    expect(isMood('focused')).toBe(true);
    expect(isMood('bored')).toBe(false);
    expect(isContext('study')).toBe(true);
    expect(isContext(null)).toBe(false);
  });

  it('parses positive integer ids and rejects anything else', () => {
    expect(parseId('1042')).toBe(1042);
    expect(parseId('0')).toBeNull();
    expect(parseId('12a')).toBeNull();
  });

  it('accepts lower-case UUIDs only', () => {
    expect(isUuid('5f2c9a1e-3b4d-4c5e-8f60-718293a4b5c6')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe('focus session durations (AC-12.1.1)', () => {
  it('matches the ranges of the database check constraints', () => {
    expect([4, 5, 120, 121].map(isFocusMin)).toEqual([false, true, true, false]);
    expect([0, 1, 30, 31].map(isBreakMin)).toEqual([false, true, true, false]);
    expect(isFocusMin(25.5)).toBe(false);
    expect(isFocusMin('25')).toBe(false);
  });
});

describe('parseTodayStart (AC-12.1.4)', () => {
  it('accepts the local midnight of any time zone', () => {
    // 00:00 in Vietnam (UTC+7) is 17:00 UTC on the previous day
    expect(parseTodayStart('2026-11-14T17:00:00.000Z', NOW)?.getTime()).toBe(NOW - 10 * HOUR);
  });

  it('rejects future values, values older than 38 hours and garbage', () => {
    expect(parseTodayStart(new Date(NOW + 60_000).toISOString(), NOW)).toBeNull();
    expect(parseTodayStart(new Date(NOW - 39 * HOUR).toISOString(), NOW)).toBeNull();
    expect(parseTodayStart('yesterday', NOW)).toBeNull();
    expect(parseTodayStart(undefined, NOW)).toBeNull();
  });
});

describe('parseCompletedAt (UC-10 exception 4a)', () => {
  it('accepts sessions sent up to 30 days late and tolerates five minutes of clock skew', () => {
    expect(parseCompletedAt(new Date(NOW - 29 * 24 * HOUR).toISOString(), NOW)).not.toBeNull();
    expect(parseCompletedAt(new Date(NOW + 4 * 60_000).toISOString(), NOW)).not.toBeNull();
  });

  it('rejects older or future sessions', () => {
    expect(parseCompletedAt(new Date(NOW - 31 * 24 * HOUR).toISOString(), NOW)).toBeNull();
    expect(parseCompletedAt(new Date(NOW + 6 * 60_000).toISOString(), NOW)).toBeNull();
    expect(parseCompletedAt(12345, NOW)).toBeNull();
  });
});
