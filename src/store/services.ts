import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { supabase } from '@/core/supabase';
import * as battery from '@/domain/battery';
import { shouldShowCheckIn } from '@/domain/checkin';
import { makeToggleTag } from '@/domain/usecases/toggleTag';
import type { ListeningContext, Mood, Song } from '@/domain/types';
import { clearPersonalData } from '@/data/local/db';
import { kvGet, kvSet } from '@/data/local/kv';
import { enqueue, listPending } from '@/data/local/outboxDao';
import { PlayerService } from '@/data/player/PlayerService';
import { api } from '@/data/remote/api';
import { SyncEngine } from '@/data/sync/SyncEngine';
import { store } from './index';
import { batteryActions } from './batterySlice';
import { moodActions } from './moodSlice';
import { networkActions } from './networkSlice';
import { playerActions, type PlayerState } from './playerSlice';
import { sessionActions } from './sessionSlice';
import { tagsActions } from './tagsSlice';
import { uiActions } from './uiSlice';

const { dispatch, getState } = store;

export const syncEngine = new SyncEngine(dispatch, getState);

export const toggleTag = makeToggleTag({
  getTag: (songId, mood) => getState().tags.bySong[songId]?.[mood],
  defaultContext: () => getState().mood.context,
  showOn: (songId, mood, tag) => dispatch(tagsActions.tagSet({ songId, mood, tag: { ...tag, pending: true } })),
  showOff: (songId, mood) => dispatch(tagsActions.tagRemoved({ songId, mood })),
  enqueue,
  sync: syncEngine.kick,
  now: Date.now,
});

// ---------- player ----------
export async function playSongs(songs: Song[], index: number, source: string) {
  dispatch(playerActions.queueSet({ queue: songs, index, source }));
  await PlayerService.playList(songs, index);
}

export function removeFromQueue(index: number) {
  PlayerService.removeAt(index);
  dispatch(playerActions.removedAt(index));
}

function updateBattery(isListening: boolean) {
  const now = Date.now();
  const s = getState().battery;
  const next = isListening ? battery.onPlay(s, now) : battery.onPause(s, now);
  const { state, banner } = battery.checkThresholds(next, now);
  if (state !== s) dispatch(batteryActions.set(state));
  if (banner) dispatch(uiActions.batteryBanner(banner));
}

/** Periodic threshold check while playing; a timer only while audio plays, never in the background. */
let thresholdTimer: ReturnType<typeof setInterval> | null = null;
function watchThresholds(on: boolean) {
  if (on && !thresholdTimer) {
    thresholdTimer = setInterval(() => {
      const { state, banner } = battery.checkThresholds(getState().battery, Date.now());
      if (state !== getState().battery) dispatch(batteryActions.set(state));
      if (banner) dispatch(uiActions.batteryBanner(banner));
    }, 30_000);
  } else if (!on && thresholdTimer) {
    clearInterval(thresholdTimer);
    thresholdTimer = null;
  }
}

// ---------- persistence (NFR-LIFE-01) ----------
const KV = { player: 'player', mood: 'mood', battery: 'battery', ui: 'ui' };
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const s = getState();
    if (s.session.status !== 'signedIn') return;
    const p: Partial<PlayerState> = {
      queue: s.player.queue,
      source: s.player.source,
      index: s.player.index,
      positionSec: s.player.positionSec,
      playedAt: s.player.playedAt,
      recent: s.player.recent,
    };
    await Promise.all([
      kvSet(KV.player, p),
      kvSet(KV.mood, { mood: s.mood.current, context: s.mood.context }),
      kvSet(KV.battery, s.battery),
      kvSet(KV.ui, { extendedAnswerTime: s.ui.extendedAnswerTime }),
    ]);
  }, 1000);
}

async function restoreLocal() {
  const [p, m, b, u] = await Promise.all([
    kvGet<Partial<PlayerState>>(KV.player),
    kvGet<{ mood: Mood | null; context: ListeningContext | null }>(KV.mood),
    kvGet<battery.BatteryState>(KV.battery),
    kvGet<{ extendedAnswerTime: boolean }>(KV.ui),
  ]);
  if (p) dispatch(playerActions.restored(p));
  if (m) dispatch(moodActions.restored(m));
  if (b) dispatch(batteryActions.set(battery.rollOver({ ...b, playingSince: null }, Date.now())));
  if (u) dispatch(uiActions.extendedAnswerTime(u.extendedAnswerTime));
  const pending = await listPending();
  for (const c of pending) {
    if (c.op === 'put') {
      dispatch(
        tagsActions.tagSet({
          songId: c.songId,
          mood: c.mood,
          tag: { note: c.note, context: c.context, createdAt: new Date(c.createdAt).toISOString(), pending: true },
        }),
      );
    } else {
      dispatch(tagsActions.tagRemoved({ songId: c.songId, mood: c.mood }));
    }
  }
}

// ---------- session ----------
export async function signOut() {
  PlayerService.reset();
  watchThresholds(false);
  await supabase.auth.signOut({ scope: 'local' });
  await clearPersonalData(); // tokens, cache and pending outbox changes (AC-01.2.2)
  dispatch(playerActions.cleared());
  dispatch(tagsActions.cleared());
  dispatch(api.util.resetApiState());
  dispatch(sessionActions.signedOut());
}

// ---------- bootstrap ----------
let started = false;
export function startServices() {
  if (started) return;
  started = true;

  void PlayerService.init({
    onStatus: (st) => {
      const prev = getState().player;
      const listening = st.isPlaying && !st.isBuffering;
      const wasListening = prev.isPlaying && !prev.isBuffering;
      dispatch(playerActions.status(st));
      if (listening !== wasListening) {
        updateBattery(listening);
        watchThresholds(listening);
      }
      persistSoon();
    },
    onIndex: (index) => {
      dispatch(playerActions.indexChanged({ index, now: Date.now() }));
      persistSoon();
    },
  });

  NetInfo.addEventListener((s) => {
    const online = s.isConnected !== false && s.isInternetReachable !== false;
    const was = getState().network.online;
    dispatch(networkActions.changed(online));
    if (online && !was) syncEngine.kick(); // outbox first, then screens refetch (AC-10.1.3)
  });

  AppState.addEventListener('change', (state) => {
    const now = Date.now();
    if (state === 'background') {
      dispatch(moodActions.wentBackground(now));
      persistSoon();
    } else if (state === 'active') {
      const s = getState();
      if (
        shouldShowCheckIn({
          coldStart: false,
          backgroundSince: s.mood.backgroundSince,
          now,
          isPlaying: s.player.isPlaying,
        })
      )
        dispatch(moodActions.checkInRequired());
      dispatch(moodActions.cameForeground());
      dispatch(batteryActions.set(battery.rollOver(s.battery, now)));
      syncEngine.kick();
    }
  });

  store.subscribe(() => {
    if (getState().session.status === 'signedIn') persistSoon();
  });

  // the onboarding flag is read before the session so the first screen is chosen correctly
  void kvGet<boolean>(ONBOARDED_KEY).then((done) => {
    if (done) dispatch(uiActions.onboarded(true));
    supabase.auth.onAuthStateChange(onAuthChange);
  });
}

function onAuthChange(event: string, session: { user: { id: string; email?: string } } | null) {
  if (session?.user) {
    if (getState().session.status === 'signedIn') return;
    const user = session.user;
    void restoreLocal().then(() => {
      dispatch(sessionActions.signedIn({ userId: user.id, email: user.email ?? null }));
      Sentry.setUser({ id: user.id }); // no email in reports (NFR-PRIV-01)
      syncEngine.kick();
      void dispatch(api.endpoints.diary.initiate()); // own tags for the tag sheet
    });
  } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
    dispatch(sessionActions.signedOut());
    Sentry.setUser(null);
  }
}

const ONBOARDED_KEY = 'device:onboarded';
export function completeOnboarding() {
  dispatch(uiActions.onboarded(true));
  void kvSet(ONBOARDED_KEY, true);
}
