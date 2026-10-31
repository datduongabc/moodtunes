import { CHECKIN_AFTER_MS, shouldShowCheckIn } from '../checkin';

describe('mood check-in rule (AC-05.1.1, AC-05.1.5)', () => {
  const now = 1_000_000_000;
  it('shows on a cold start', () => {
    expect(shouldShowCheckIn({ coldStart: true, backgroundSince: null, now, isPlaying: false })).toBe(true);
  });
  it('shows after 30 minutes in the background', () => {
    expect(
      shouldShowCheckIn({ coldStart: false, backgroundSince: now - CHECKIN_AFTER_MS, now, isPlaying: false }),
    ).toBe(true);
  });
  it('does not show after a shorter time', () => {
    expect(
      shouldShowCheckIn({ coldStart: false, backgroundSince: now - CHECKIN_AFTER_MS + 1, now, isPlaying: false }),
    ).toBe(false);
  });
  it('does not show while music is playing', () => {
    expect(shouldShowCheckIn({ coldStart: true, backgroundSince: 0, now, isPlaying: true })).toBe(false);
  });
});
