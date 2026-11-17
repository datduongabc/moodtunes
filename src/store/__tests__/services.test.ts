/**
 * Store services against in-memory stand-ins for Supabase, SQLite, the network and the player.
 * jest.mock calls are hoisted above the imports, so the store loads with these stand-ins.
 */
import { api } from '@/data/remote/api';
import { store } from '@/store';
import { signOut, startServices, toggleTag } from '@/store/services';

jest.mock('@/core/config', () => ({
  config: { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'k', sentryDsn: '', requestTimeoutMs: 10_000 },
  apiBaseUrl: () => 'https://x.supabase.co/functions/v1/api/v1',
  restBaseUrl: () => 'https://x.supabase.co/rest/v1',
}));

type AuthCallback = (event: string, session: { user: { id: string } } | null) => Promise<void> | void;
const mockAuth: { cb: AuthCallback | null } = { cb: null };
jest.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        mockAuth.cb = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      // like supabase-js, signOut awaits the SIGNED_OUT listeners
      signOut: jest.fn(async () => {
        await mockAuth.cb?.('SIGNED_OUT', null);
        return { error: null };
      }),
    },
  },
}));

// every request fails as offline unless a test answers it
const mockHttp: { answer: (url: string) => unknown } = { answer: () => null };
jest.mock('@/core/http', () => ({
  http: async (req: { url: string }) => {
    const data = mockHttp.answer(req.url);
    return data === null
      ? { error: { status: 'NETWORK', code: 'NETWORK', message: 'Connection problem' } }
      : { data, headers: new Headers() };
  },
}));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));
jest.mock('@sentry/react-native', () => ({ setUser: jest.fn() }));
jest.mock('@/data/player/PlayerService', () => ({
  PlayerService: { init: async () => {}, reset: jest.fn(), setRestored: jest.fn(), pause: jest.fn() },
}));

// in-memory stand-ins for the SQLite key-value table, cache and outbox
const mockKv = new Map<string, unknown>();
const mockDb: { outbox: unknown[]; enqueued: unknown[] } = { outbox: [], enqueued: [] };
jest.mock('@/data/local/kv', () => ({
  kvGet: async (k: string) => mockKv.get(k) ?? null,
  kvSet: async (k: string, v: unknown) => void mockKv.set(k, v),
}));
jest.mock('@/data/local/cache', () => ({
  cacheKeys: { chart: () => 'c', recs: () => 'r', diary: () => 'd' },
  cacheGet: async () => null,
  cachePut: async () => {},
}));
jest.mock('@/data/local/outboxDao', () => ({
  enqueue: async (c: unknown) => void mockDb.enqueued.push(c),
  listPending: async () => mockDb.outbox,
  remove: async () => {},
  markAttempt: async () => {},
  hasPending: async () => false,
}));
jest.mock('@/data/local/db', () => ({
  clearPersonalData: jest.fn(async () => {
    for (const k of [...mockKv.keys()]) if (!k.startsWith('device:')) mockKv.delete(k);
    mockDb.outbox = [];
  }),
}));

const flush = () => new Promise((r) => setTimeout(r, 0));
const song = (id: number) => ({
  id,
  jamendoId: null,
  title: `Song ${id}`,
  artistName: 'A',
  albumName: null,
  durationSec: 120,
  audioUrl: 'https://a/1.mp3',
  imageUrl: null,
  licenseName: 'CC',
  licenseUrl: 'https://cc',
});

async function signInAsA() {
  mockKv.set('player', { queue: [song(1)], index: 0, positionSec: 10, playedAt: {}, recent: [] });
  mockKv.set('pomodoro', [{ id: 'p1', focusMin: 25, breakMin: 5, mood: 'focused', completedAt: Date.now() }]);
  mockDb.outbox = [
    { songId: 1, mood: 'sad', op: 'put', note: 'private note', context: null, createdAt: 1, attempts: 0 },
  ];
  await mockAuth.cb!('SIGNED_IN', { user: { id: 'user-a' } });
  await flush();
  expect(store.getState().session.userId).toBe('user-a');
  expect(store.getState().tags.bySong[1]?.sad?.note).toBe('private note');
}

function expectNothingOfA() {
  const s = store.getState();
  expect(s.session.status).toBe('signedOut');
  expect(s.player.queue).toEqual([]);
  expect(s.pomodoro.pending).toEqual([]);
  expect(s.tags.bySong).toEqual({});
  expect(mockKv.has('player')).toBe(false);
  expect(mockKv.has('pomodoro')).toBe(false);
  expect(mockDb.outbox).toEqual([]);
  expect(mockKv.get('device:onboarded')).toBe(true); // device settings survive
}

beforeAll(async () => {
  mockKv.set('device:onboarded', true);
  startServices();
  await flush();
  expect(mockAuth.cb).not.toBeNull();
});

afterEach(async () => {
  mockHttp.answer = () => null;
  mockDb.enqueued = [];
  await signOut();
});

describe('end of a session (AC-01.2.2)', () => {
  it('wipes the account data when the server ends the session (refresh token rejected)', async () => {
    await signInAsA();
    await mockAuth.cb!('SIGNED_OUT', null);
    await flush();
    expectNothingOfA();
  });

  it('wipes data left behind when the session is already gone at start-up', async () => {
    await signInAsA();
    await mockAuth.cb!('SIGNED_OUT', null);
    await flush();
    // the app was killed before, leaving A's data on disk; the next start has no session
    mockKv.set('player', { queue: [song(1)], index: 0, positionSec: 0, playedAt: {}, recent: [] });
    mockDb.outbox = [{ songId: 1, mood: 'sad', op: 'put', note: 'x', context: null, createdAt: 1, attempts: 0 }];
    await mockAuth.cb!('INITIAL_SESSION', null);
    await flush();
    expectNothingOfA();
  });

  it('wipes the account data when the listener taps Sign out', async () => {
    await signInAsA();
    await signOut();
    expectNothingOfA();
  });
});

describe('own tags older than the diary (FR-04)', () => {
  const oldTag = { mood_code: 'happy', context: null, note: 'old note', created_at: '2026-01-02T03:04:05+00:00' };

  it('a tap on a tag from outside the 90-day diary removes it instead of overwriting its note', async () => {
    await signInAsA();
    mockHttp.answer = (url) => (url.includes('mood_tags?song_id=eq.2') ? [oldTag] : null);
    await store.dispatch(api.endpoints.songTags.initiate(2));
    expect(store.getState().tags.bySong[2]?.happy).toMatchObject({ note: 'old note', pending: false });

    await toggleTag(2, 'happy');
    expect(mockDb.enqueued).toEqual([expect.objectContaining({ songId: 2, mood: 'happy', op: 'delete' })]);
  });

  it('keeps unsent local changes and drops tags the server no longer has', async () => {
    await signInAsA(); // song 1: "sad" waiting in the outbox
    store.dispatch({
      type: 'tags/tagSet',
      payload: { songId: 1, mood: 'relaxed', tag: { note: null, context: null, createdAt: 'x', pending: false } },
    });
    mockHttp.answer = (url) => (url.includes('mood_tags?song_id=eq.1') ? [oldTag] : null);
    await store.dispatch(api.endpoints.songTags.initiate(1));
    const tags = store.getState().tags.bySong[1]!;
    expect(Object.keys(tags).sort()).toEqual(['happy', 'sad']); // "relaxed" was removed on another device
    expect(tags.sad).toMatchObject({ note: 'private note', pending: true });
  });
});
