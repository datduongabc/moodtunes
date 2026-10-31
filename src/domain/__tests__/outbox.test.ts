import { backoffMs, mergeChange, outboxKey, type OutboxChange } from '../outbox';

const change = (songId: number, mood: 'happy' | 'sad', op: 'put' | 'delete', createdAt: number) => ({
  songId,
  mood,
  op,
  note: null,
  context: null,
  createdAt,
});

describe('outbox (FR-10)', () => {
  it('keeps only the final state of a tag toggled several times (AC-10.1.4)', () => {
    let q: OutboxChange[] = [];
    q = mergeChange(q, change(1, 'happy', 'put', 1));
    q = mergeChange(q, change(1, 'happy', 'delete', 2));
    q = mergeChange(q, change(1, 'happy', 'put', 3));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ op: 'put', createdAt: 3, attempts: 0 });
  });
  it('orders changes by creation time (AC-10.1.3)', () => {
    let q: OutboxChange[] = [];
    q = mergeChange(q, change(2, 'sad', 'put', 5));
    q = mergeChange(q, change(1, 'happy', 'put', 2));
    expect(q.map((c) => outboxKey(c.songId, c.mood))).toEqual(['1:happy', '2:sad']);
  });
  it('waits for Retry-After, otherwise backs off exponentially up to 60 s', () => {
    expect(backoffMs(1, 42)).toBe(42_000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(3)).toBe(8000);
    expect(backoffMs(10)).toBe(60_000);
  });
});
