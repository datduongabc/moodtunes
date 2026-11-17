/**
 * SyncEngine against an in-memory outbox with the same contract as outboxDao: one row per song and
 * mood, a newer change replaces the older one, and removal matches the change's createdAt.
 */
import type { AppError } from '@/core/errors';
import type { OutboxChange } from '@/domain/outbox';
import type { RootState } from '@/store';
import { SyncEngine } from '../SyncEngine';

jest.mock('@/core/config', () => ({
  config: { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'k', sentryDsn: '', requestTimeoutMs: 10_000 },
  apiBaseUrl: () => 'https://x.supabase.co/functions/v1/api/v1',
  restBaseUrl: () => 'https://x.supabase.co/rest/v1',
}));
jest.mock('@/core/supabase', () => ({ supabase: { auth: {} } }));

const mockOutbox: { rows: OutboxChange[] } = { rows: [] };
jest.mock('@/data/local/outboxDao', () => {
  const same = (a: OutboxChange, b: OutboxChange) =>
    a.songId === b.songId && a.mood === b.mood && a.createdAt === b.createdAt;
  return {
    listPending: async () => [...mockOutbox.rows].sort((a, b) => a.createdAt - b.createdAt),
    remove: async (c: OutboxChange) => {
      mockOutbox.rows = mockOutbox.rows.filter((r) => !same(r, c));
    },
    markAttempt: async (c: OutboxChange) => {
      for (const r of mockOutbox.rows) if (same(r, c)) r.attempts++;
    },
    hasPending: async (songId: number, mood: string) =>
      mockOutbox.rows.some((r) => r.songId === songId && r.mood === mood),
  };
});

// the server: answers each request with the next queued reply, success when none is queued
const mockServer: { sent: string[]; replies: (AppError | null)[]; beforeReply?: () => void } = {
  sent: [],
  replies: [],
};
jest.mock('@/data/remote/tags', () => ({
  sendTagChange: async (c: OutboxChange) => {
    mockServer.sent.push(`${c.op} ${c.songId}:${c.mood}`);
    mockServer.beforeReply?.();
    const e = mockServer.replies.shift() ?? null;
    return e ? { error: e } : { data: null, headers: new Headers() };
  },
}));

const change = (songId: number, mood: OutboxChange['mood'], op: 'put' | 'delete', createdAt: number) => ({
  songId,
  mood,
  op,
  note: null,
  context: null,
  createdAt,
  attempts: 0,
});
const err = (status: AppError['status'], retryAfterSec?: number): AppError => ({
  status,
  code: String(status),
  message: '',
  retryAfterSec,
});

// a run is a chain of awaited promises; let it finish
const drain = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

function setup(state: { online?: boolean; signedIn?: boolean } = {}) {
  const actions: { type: string; payload?: unknown }[] = [];
  const getState = () =>
    ({
      network: { online: state.online ?? true },
      session: { status: state.signedIn === false ? 'signedOut' : 'signedIn' },
    }) as RootState;
  const engine = new SyncEngine(((a: { type: string }) => void actions.push(a)) as never, getState);
  const run = async () => {
    engine.kick();
    await drain();
  };
  const types = () => actions.map((a) => a.type);
  return { run, actions, types };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockOutbox.rows = [];
  mockServer.sent = [];
  mockServer.replies = [];
  mockServer.beforeReply = undefined;
});
afterEach(() => jest.useRealTimers());

describe('SyncEngine (CMP-APP-10, FR-10)', () => {
  it('sends changes oldest first and removes each one the server accepted (AC-10.1.3)', async () => {
    mockOutbox.rows = [change(2, 'sad', 'delete', 20), change(1, 'happy', 'put', 10)];
    const h = setup();
    await h.run();
    expect(mockServer.sent).toEqual(['put 1:happy', 'delete 2:sad']);
    expect(mockOutbox.rows).toEqual([]);
    expect(h.actions).toContainEqual({ type: 'tags/synced', payload: { songId: 1, mood: 'happy' } });
    expect(h.types()).toContain('api/invalidateTags');
  });

  it('stops at a connection problem and keeps the order for the next run', async () => {
    mockOutbox.rows = [change(1, 'happy', 'put', 10), change(2, 'sad', 'put', 20)];
    mockServer.replies = [err('NETWORK')];
    const h = setup();
    await h.run();
    expect(mockServer.sent).toEqual(['put 1:happy']); // the second change waits behind the first
    expect(mockOutbox.rows.map((r) => [r.songId, r.attempts])).toEqual([
      [1, 1],
      [2, 0],
    ]);
    expect(h.types()).not.toContain('api/invalidateTags');
    expect(jest.getTimerCount()).toBe(0); // offline: the reconnection triggers the next run, not a timer
  });

  it('drops a change the server rejects as invalid and hides the tag it would have added', async () => {
    mockOutbox.rows = [change(1, 'happy', 'put', 10), change(2, 'sad', 'put', 20)];
    mockServer.replies = [err(404), err(400)]; // song gone; change invalid
    const h = setup();
    await h.run();
    expect(mockServer.sent).toEqual(['put 1:happy', 'put 2:sad']);
    expect(mockOutbox.rows).toEqual([]);
    expect(h.actions).toContainEqual({ type: 'tags/tagRemoved', payload: { songId: 1, mood: 'happy' } });
    expect(h.actions).toContainEqual({ type: 'tags/tagRemoved', payload: { songId: 2, mood: 'sad' } });
  });

  it('waits the time the server asks for after a rate limit, then retries', async () => {
    mockOutbox.rows = [change(1, 'happy', 'put', 10)];
    mockServer.replies = [err(429, 7)];
    const h = setup();
    await h.run();
    expect(h.types()).toContain('ui/snack');
    expect(mockOutbox.rows).toHaveLength(1);
    jest.advanceTimersByTime(6_999);
    await drain();
    expect(mockServer.sent).toHaveLength(1);
    jest.advanceTimersByTime(1);
    await drain();
    expect(mockServer.sent).toHaveLength(2);
    expect(mockOutbox.rows).toEqual([]);
  });

  it('keeps a change replaced while its request was in flight (AC-10.1.4)', async () => {
    mockOutbox.rows = [change(1, 'happy', 'put', 10)];
    // the listener taps again while the PUT is on its way: the row becomes a newer DELETE
    mockServer.beforeReply = () => {
      mockServer.beforeReply = undefined;
      mockOutbox.rows = [change(1, 'happy', 'delete', 30)];
    };
    const h = setup();
    await h.run();
    // the accepted PUT must not remove the DELETE, and the tag must stay marked as pending
    expect(h.actions).not.toContainEqual({ type: 'tags/synced', payload: { songId: 1, mood: 'happy' } });
    expect(mockServer.sent[0]).toBe('put 1:happy');
    expect(mockOutbox.rows).toEqual([change(1, 'happy', 'delete', 30)]);
  });

  it('does nothing while offline or signed out', async () => {
    mockOutbox.rows = [change(1, 'happy', 'put', 10)];
    await setup({ online: false }).run();
    await setup({ signedIn: false }).run();
    expect(mockServer.sent).toEqual([]);
  });
});
