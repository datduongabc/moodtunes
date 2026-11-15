import { moodShares, startOfLocalMonth, startOfLocalWeek } from '../stats';
import type { Mood } from '../types';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
const e = (mood: Mood, createdAt: string) => ({ mood, createdAt });

describe('period boundaries', () => {
  it('starts the week on Monday at local midnight', () => {
    // Sunday 15 November 2026 belongs to the week starting Monday 9 November
    const sunday = new Date(2026, 10, 15, 18).getTime();
    const start = startOfLocalWeek(sunday);
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 10, 9, 0]);
    const monday = new Date(2026, 10, 16, 0, 1).getTime();
    expect(startOfLocalWeek(monday).getDate()).toBe(16);
  });

  it('starts the month on the 1st at local midnight', () => {
    const start = startOfLocalMonth(new Date(2026, 10, 15, 18).getTime());
    expect([start.getMonth(), start.getDate(), start.getHours()]).toEqual([10, 1, 0]);
  });
});

describe('moodShares (AC-14.1.1)', () => {
  const since = new Date(2026, 10, 9).getTime();

  it('counts tags since the start of the period and sorts by share', () => {
    const out = moodShares(
      [
        e('happy', at(2026, 11, 10)),
        e('focused', at(2026, 11, 11)),
        e('focused', at(2026, 11, 12)),
        e('sad', at(2026, 11, 1)), // before the period
      ],
      since,
    );
    expect(out).toEqual([
      { mood: 'focused', count: 2, share: 2 / 3 },
      { mood: 'happy', count: 1, share: 1 / 3 },
    ]);
  });

  it('returns an empty list when there are no tags in the period', () => {
    expect(moodShares([e('sad', at(2026, 11, 1))], since)).toEqual([]);
  });
});
