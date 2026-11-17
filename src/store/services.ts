import NetInfo from '@react-native-community/netinfo';
import { AppState, Share, Vibration } from 'react-native';
import * as Sentry from '@sentry/react-native';
import type { AppError } from '@/core/errors';
import { supabase } from '@/core/supabase';
import * as battery from '@/domain/battery';
import { shouldShowCheckIn } from '@/domain/checkin';
import { dueTransition, newSessionId, startOfLocalDay, type PendingSession } from '@/domain/pomodoro';
import { buildSongSharePayload } from '@/domain/share';
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
import { pomodoroActions } from './pomodoroSlice';
import { sessionActions } from './sessionSlice';
import { tagsActions } from './tagsSlice';
import { uiActions } from './uiSlice';

const { dispatch, getState } = store;

export const syncEngine = new SyncEngine(dispatch, getState);

export const toggleTag = makeToggleTag({
  getTag: (songId, mood) => getState().tags.bySong[songId]?.[mood],
  defaultContext: () => getState().mood.context,
  showOn: (songId, mood, tag) => dispatch(tagsActions.tagSet({ songId, mood, tag: { ...tag, pending: true } })),
  showOff: (songId, mood) => dispatch(tagsActions.tagRemoved({ songId, mood, pending: true })),
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
const KV = { player: 'player', mood: 'mood', battery: 'battery', pomodoro: 'pomodoro' };
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
      kvSet(KV.pomodoro, s.pomodoro.pending),
    ]);
  }, 1000);
}

async function restoreLocal() {
  const [p, m, b, focusQueue] = await Promise.all([
    kvGet<Partial<PlayerState>>(KV.player),
    kvGet<{ mood: Mood | null; context: ListeningContext | null }>(KV.mood),
    kvGet<battery.BatteryState>(KV.battery),
    kvGet<PendingSession[]>(KV.pomodoro),
  ]);
  if (focusQueue?.length) dispatch(pomodoroActions.pendingRestored(focusQueue));
  if (p) {
    dispatch(playerActions.restored(p));
    PlayerService.setRestored(p.queue ?? [], p.index ?? 0, p.positionSec ?? 0);
  }
  if (m) dispatch(moodActions.restored(m));
  if (b) dispatch(batteryActions.set(battery.rollOver({ ...b, playingSince: null }, Date.now())));
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
      dispatch(tagsActions.tagRemoved({ songId: c.songId, mood: c.mood, pending: true }));
    }
  }
}

// ---------- Pomodoro (FR-12) ----------
/**
 * Applies a due Focus or Break transition. It lives here rather than in the screen because the
 * screen's timer stops when the app is in the background or the tab is not mounted, while music
 * keeps playing. The player's status events keep arriving every second during background
 * playback, so checking on each of them pauses the music on time even with the screen off
 * (AC-12.1.2). Without playback (break, or nothing loaded), the check runs when the app returns
 * to the foreground, and the countdown, computed from the deadline, is already correct.
 */
export function checkPomodoro(now = Date.now()) {
  const s = getState().pomodoro;
  const due = dueTransition(s, now);
  if (due === 'focusDone') {
    PlayerService.pause();
    Vibration.vibrate([0, 250, 150, 250]);
    // the break is measured from the moment focus ended, not from when the app noticed it
    dispatch(pomodoroActions.started({ phase: 'break', endsAtMs: s.endsAtMs! + s.breakMin * 60_000 }));
    dispatch(uiActions.snack(`Focus complete! Enjoy a ${s.breakMin}-min break`));
    dispatch(
      pomodoroActions.sessionQueued({
        id: newSessionId(),
        focusMin: s.focusMin,
        breakMin: s.breakMin,
        mood: s.mood,
        completedAt: s.endsAtMs!,
      }),
    );
    void flushPomodoroSessions();
    checkPomodoro(now); // the break may also be over already
  } else if (due === 'breakDone') {
    Vibration.vibrate(250);
    dispatch(pomodoroActions.reset());
    dispatch(uiActions.snack('Break finished! Ready for another focus session'));
  }
}

/**
 * Sends the queued sessions in order. A network failure stops the run and leaves the rest queued
 * for the next trigger (reconnection, foreground, sign-in); a session the server rejects as invalid
 * is dropped, since resending it can never succeed. The client-generated id makes a resend after a
 * lost response harmless.
 */
let flushing = false;
export async function flushPomodoroSessions() {
  if (flushing || getState().session.status !== 'signedIn') return;
  flushing = true;
  try {
    for (const p of [...getState().pomodoro.pending]) {
      const res = await dispatch(
        api.endpoints.completePomodoroSession.initiate({
          id: p.id,
          focusMin: p.focusMin,
          breakMin: p.breakMin,
          mood: p.mood,
          completedAt: new Date(p.completedAt).toISOString(),
          todayStart: startOfLocalDay(Date.now()).toISOString(),
        }),
      );
      if ('error' in res) {
        if ((res.error as AppError).status === 400) {
          dispatch(pomodoroActions.sessionsSent([p.id]));
          continue;
        }
        break;
      }
      dispatch(pomodoroActions.sessionsSent([p.id]));
    }
  } finally {
    flushing = false;
  }
}

export async function shareSong(song: Song, moods: Mood[]) {
  const payload = buildSongSharePayload(song, moods);
  try {
    await Share.share({
      title: payload.title,
      message: payload.message,
      url: payload.url,
    });
  } catch {
    dispatch(uiActions.snack("Couldn't open the share sheet. Try again"));
  }
}

// ---------- session ----------
/**
 * Removes everything that belongs to the account (AC-01.2.2). It runs on every end of a session,
 * not only on Sign out: a refresh token the server rejects, or a session already gone at start-up,
 * would otherwise leave the queue, pending tags and focus sessions for the next account to send.
 */
let clearing: Promise<void> = Promise.resolve();
function endSession() {
  dispatch(sessionActions.signedOut()); // first, so persistSoon stops writing
  Sentry.setUser(null);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  PlayerService.reset();
  watchThresholds(false);
  dispatch(playerActions.cleared());
  dispatch(pomodoroActions.cleared());
  dispatch(tagsActions.cleared());
  dispatch(moodActions.cleared());
  dispatch(batteryActions.cleared());
  dispatch(api.util.resetApiState());
  clearing = clearPersonalData(); // cache, outbox and saved state; device settings stay
  return clearing;
}

export async function signOut() {
  await supabase.auth.signOut({ scope: 'local' }); // emits SIGNED_OUT, which calls endSession
  await clearing;
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
      checkPomodoro();
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
    if (online && !was) {
      syncEngine.kick(); // outbox first, then screens refetch (AC-10.1.3)
      void flushPomodoroSessions();
    }
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
      checkPomodoro(now);
      syncEngine.kick();
      void flushPomodoroSessions();
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
      void flushPomodoroSessions();
      void dispatch(api.endpoints.diary.initiate()); // own tags for the tag sheet
    });
  } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
    return endSession();
  }
}

const ONBOARDED_KEY = 'device:onboarded';
export function completeOnboarding() {
  dispatch(uiActions.onboarded(true));
  void kvSet(ONBOARDED_KEY, true);
}
