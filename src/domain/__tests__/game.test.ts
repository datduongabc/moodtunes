import { answerSeconds, maxRoundScore, pointsFor } from '../game';

describe('Mood Guess scoring (AC-11.1.3)', () => {
  it('scores 100 + 20 (k - 1) for a streak of k', () => {
    expect(pointsFor(1)).toBe(100);
    expect(pointsFor(2)).toBe(120);
    expect(pointsFor(4)).toBe(160);
  });
  it('scores 0 for a wrong or missing answer', () => {
    expect(pointsFor(0)).toBe(0);
  });
  it('has a maximum round score of 1,900', () => {
    expect(maxRoundScore()).toBe(1900);
  });
  it('allows 20 s, or 40 s with extended answer time', () => {
    expect(answerSeconds(false)).toBe(20);
    expect(answerSeconds(true)).toBe(40);
  });
});
