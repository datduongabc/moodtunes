import { backoffMs } from '../outbox';

describe('outbox (FR-10)', () => {
  it('waits for Retry-After, otherwise backs off exponentially up to 60 s', () => {
    expect(backoffMs(1, 42)).toBe(42_000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(3)).toBe(8000);
    expect(backoffMs(10)).toBe(60_000);
  });
});
