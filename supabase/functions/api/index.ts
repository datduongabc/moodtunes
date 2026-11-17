// Edge Function "api": business endpoints /v1 (A01 table 6.4, CMP-BE-03)
import { Hono, type Context as HonoContext } from 'hono';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError, fromDbError } from './errors.ts';
import {
  isBreakMin,
  isContext,
  isFocusMin,
  isMood,
  isUuid,
  parseCompletedAt,
  parseId,
  parseTodayStart,
} from './validate.ts';

type Env = { Variables: { userId: string; requestId: string } };

const admin: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SONG_COLUMNS =
  'id, jamendo_id, title, artist_name, album_name, duration_sec, audio_url, image_url, license_name, license_url';

type SongRow = {
  id: number;
  jamendo_id: string;
  title: string;
  artist_name: string;
  album_name: string | null;
  duration_sec: number;
  audio_url: string;
  image_url: string | null;
  license_name: string;
  license_url: string;
};

const toSong = (s: SongRow) => ({
  id: s.id,
  jamendoId: s.jamendo_id,
  title: s.title,
  artistName: s.artist_name,
  albumName: s.album_name,
  durationSec: s.duration_sec,
  audioUrl: s.audio_url,
  imageUrl: s.image_url,
  licenseName: s.license_name,
  licenseUrl: s.license_url,
});

async function songsById(ids: number[]): Promise<Map<number, ReturnType<typeof toSong>>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await admin.from('songs').select(SONG_COLUMNS).in('id', ids);
  if (error) throw fromDbError(error);
  return new Map((data as SongRow[]).map((s) => [s.id, toSong(s)]));
}

async function rateLimit(userId: string, action: 'tag', limit: number, window: string) {
  const { data, error } = await admin.rpc('check_rate', {
    p_user: userId,
    p_action: action,
    p_limit: limit,
    p_window: window,
  });
  if (error) throw fromDbError(error);
  if ((data as number) > 0) {
    throw new ApiError('RATE_LIMITED', 'Too many tags at once. Try again in a minute', { retryAfterSec: data });
  }
}

async function readJson(c: HonoContext<Env>): Promise<Record<string, unknown>> {
  if (!c.req.header('content-type')?.includes('application/json')) return {};
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Malformed JSON body');
  }
}

const app = new Hono<Env>().basePath('/api');

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID().slice(0, 8));
  const token = c.req.header('authorization')?.replace(/^Bearer /i, '');
  if (!token) throw new ApiError('UNAUTHENTICATED', 'Sign in required');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ApiError('UNAUTHENTICATED', 'Session expired');
  c.set('userId', data.user.id);
  await next();
});

// API-06 recommendations
app.get('/v1/recommendations', async (c) => {
  const mood = c.req.query('mood');
  const context = c.req.query('context') || null;
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 20) || 20, 1), 20);
  if (!isMood(mood)) throw new ApiError('VALIDATION_ERROR', 'Unknown mood', { field: 'mood' });
  if (context !== null && !isContext(context))
    throw new ApiError('VALIDATION_ERROR', 'Unknown context', { field: 'context' });

  const { data, error } = await admin.rpc('recommend', {
    p_user: c.get('userId'),
    p_mood: mood,
    p_context: context,
    p_limit: limit,
  });
  if (error) throw fromDbError(error);
  const rows = data as { song_id: number; score: number; is_sample: boolean }[];
  const songs = await songsById(rows.map((r) => r.song_id));
  return c.json({
    mood,
    context,
    isSample: rows.length > 0 && rows[0].is_sample,
    items: rows
      .filter((r) => songs.has(r.song_id))
      .map((r) => ({ song: songs.get(r.song_id), score: Number(r.score) })),
  });
});

// API-07 add or update own tag (idempotent)
app.put('/v1/songs/:songId/tags/:mood', async (c) => {
  const songId = parseId(c.req.param('songId'));
  const mood = c.req.param('mood');
  if (songId === null) throw new ApiError('VALIDATION_ERROR', 'Invalid song id', { field: 'songId' });
  if (!isMood(mood)) throw new ApiError('VALIDATION_ERROR', 'Unknown mood', { field: 'mood' });
  const body = await readJson(c);
  const note = body.note ?? null;
  const context = body.context ?? null;
  if (note !== null && (typeof note !== 'string' || [...note].length > 140)) {
    throw new ApiError('VALIDATION_ERROR', 'Note must be at most 140 characters', { field: 'note' });
  }
  if (context !== null && !isContext(context))
    throw new ApiError('VALIDATION_ERROR', 'Unknown context', { field: 'context' });

  const userId = c.get('userId');
  await rateLimit(userId, 'tag', 30, '1 minute');
  const { data: song } = await admin.from('songs').select('id').eq('id', songId).maybeSingle();
  if (!song) throw new ApiError('NOT_FOUND', 'This song is no longer available');

  const { data, error } = await admin
    .from('mood_tags')
    .upsert(
      { user_id: userId, song_id: songId, mood_code: mood, note, context },
      { onConflict: 'user_id,song_id,mood_code' },
    )
    .select('song_id, mood_code, context, note, created_at, updated_at')
    .single();
  if (error) throw fromDbError(error);
  return c.json({
    tag: {
      songId: data.song_id,
      mood: data.mood_code,
      context: data.context,
      note: data.note,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
});

// API-08 remove own tag (idempotent: 204 also when the tag does not exist)
app.delete('/v1/songs/:songId/tags/:mood', async (c) => {
  const songId = parseId(c.req.param('songId'));
  const mood = c.req.param('mood');
  if (songId === null) throw new ApiError('VALIDATION_ERROR', 'Invalid song id', { field: 'songId' });
  if (!isMood(mood)) throw new ApiError('VALIDATION_ERROR', 'Unknown mood', { field: 'mood' });
  const userId = c.get('userId');
  await rateLimit(userId, 'tag', 30, '1 minute');
  const { error } = await admin
    .from('mood_tags')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', songId)
    .eq('mood_code', mood);
  if (error) throw fromDbError(error);
  return c.body(null, 204);
});

// API-10 chart
app.get('/v1/charts/:mood', async (c) => {
  const mood = c.req.param('mood');
  const period = c.req.query('period') ?? 'week';
  if (!isMood(mood)) throw new ApiError('VALIDATION_ERROR', 'Unknown mood', { field: 'mood' });
  if (period !== 'week') throw new ApiError('VALIDATION_ERROR', 'Unsupported period', { field: 'period' });

  const { data: snap, error } = await admin
    .from('chart_snapshots')
    .select('id, computed_at, is_sample')
    .eq('mood_code', mood)
    .eq('period', period)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!snap) return c.json({ mood, period, computedAt: null, isSample: true, entries: [] });

  const { data: entries, error: e2 } = await admin
    .from('chart_entries')
    .select('rank, song_id, votes, previous_rank')
    .eq('snapshot_id', snap.id)
    .order('rank');
  if (e2) throw fromDbError(e2);
  const ids = entries.map((e) => e.song_id as number);
  const songs = await songsById(ids);
  const { data: mine } = await admin
    .from('mood_tags')
    .select('song_id')
    .eq('user_id', c.get('userId'))
    .eq('mood_code', mood)
    .in('song_id', ids.length ? ids : [0]);
  const voted = new Set((mine ?? []).map((m) => m.song_id as number));

  c.header('Cache-Control', 'private, max-age=60');
  return c.json({
    mood,
    period,
    computedAt: snap.computed_at,
    isSample: snap.is_sample,
    entries: entries
      .filter((e) => songs.has(e.song_id))
      .map((e) => ({
        rank: e.rank,
        votes: e.votes,
        previousRank: e.previous_rank,
        myVote: voted.has(e.song_id),
        song: songs.get(e.song_id),
      })),
  });
});

/** "Today" starts at the caller's local midnight; a UTC midnight would put 0:00 to 7:00 in Vietnam on the previous day. */
function todayStartFrom(v: unknown): Date {
  const parsed = parseTodayStart(v, Date.now());
  if (!parsed) {
    throw new ApiError('VALIDATION_ERROR', 'todayStart must be the start of your local day', { field: 'todayStart' });
  }
  return parsed;
}

async function pomodoroStatsFor(userId: string, todayStart: Date) {
  const { data, error } = await admin
    .rpc('pomodoro_stats', { p_user: userId, p_today_start: todayStart.toISOString() })
    .single<{ total_sessions: number; total_focus_minutes: number; today_focus_minutes: number }>();
  if (error) throw fromDbError(error);
  return {
    totalSessions: data.total_sessions,
    totalFocusMinutes: data.total_focus_minutes,
    todayFocusMinutes: data.today_focus_minutes,
  };
}

// API-11 record a completed Pomodoro focus session
app.post('/v1/pomodoro-sessions', async (c) => {
  const body = await readJson(c);
  const focusMin = body.focusMin;
  const breakMin = body.breakMin;
  const mood = body.mood ?? null;
  const todayStart = todayStartFrom(body.todayStart);
  if (!isUuid(body.id)) {
    throw new ApiError('VALIDATION_ERROR', 'id must be a UUID generated by the device', { field: 'id' });
  }
  const completedAt = parseCompletedAt(body.completedAt, Date.now());
  if (!completedAt) {
    throw new ApiError('VALIDATION_ERROR', 'completedAt must be within the last 30 days', { field: 'completedAt' });
  }
  if (!isFocusMin(focusMin)) {
    throw new ApiError('VALIDATION_ERROR', 'Focus duration must be 5 to 120 minutes', { field: 'focusMin' });
  }
  if (!isBreakMin(breakMin)) {
    throw new ApiError('VALIDATION_ERROR', 'Break duration must be 1 to 30 minutes', { field: 'breakMin' });
  }
  if (mood !== null && !isMood(mood)) {
    throw new ApiError('VALIDATION_ERROR', 'Unknown mood', { field: 'mood' });
  }
  const userId = c.get('userId');
  // the device may resend a session after a lost response; the same id is then ignored
  const { error } = await admin.from('pomodoro_sessions').upsert(
    {
      id: body.id,
      user_id: userId,
      focus_min: focusMin,
      break_min: breakMin,
      mood,
      completed_at: completedAt.toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw fromDbError(error);
  return c.json(await pomodoroStatsFor(userId, todayStart), 201);
});

// API-12 Pomodoro focus statistics
app.get('/v1/me/pomodoro-stats', async (c) => {
  return c.json(await pomodoroStatsFor(c.get('userId'), todayStartFrom(c.req.query('todayStart'))));
});

// API-14 check-in
app.post('/v1/checkins', async (c) => {
  const body = await readJson(c);
  const mood = body.mood;
  const context = body.context ?? null;
  if (!isMood(mood)) throw new ApiError('VALIDATION_ERROR', 'Unknown mood', { field: 'mood' });
  if (context !== null && !isContext(context))
    throw new ApiError('VALIDATION_ERROR', 'Unknown context', { field: 'context' });
  const { data, error } = await admin
    .from('checkins')
    .insert({ user_id: c.get('userId'), mood_code: mood, context })
    .select('id')
    .single();
  if (error) throw fromDbError(error);
  return c.json({ id: data.id }, 201);
});

// API-15 delete account and all data (cascades from auth.users)
app.delete('/v1/me', async (c) => {
  const { error } = await admin.auth.admin.deleteUser(c.get('userId'));
  if (error) throw new ApiError('INTERNAL_ERROR', 'Could not delete the account');
  return c.body(null, 204);
});

function errorResponse(c: HonoContext<Env>, err: unknown) {
  const requestId = c.get('requestId') ?? crypto.randomUUID().slice(0, 8);
  const e = err instanceof ApiError ? err : new ApiError('INTERNAL_ERROR', 'Unexpected server error');
  if (!(err instanceof ApiError)) console.error(requestId, err);
  if (e.code === 'RATE_LIMITED' && e.details?.retryAfterSec) c.header('Retry-After', String(e.details.retryAfterSec));
  return c.json({ error: { code: e.code, message: e.message, details: e.details ?? {} }, requestId }, e.status as 400);
}

app.notFound((c) => errorResponse(c, new ApiError('NOT_FOUND', 'Unknown endpoint')));
app.onError((err, c) => errorResponse(c, err));

Deno.serve(app.fetch);
