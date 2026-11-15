import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { apiBaseUrl, restBaseUrl } from '@/core/config';
import { isOfflineError, type AppError } from '@/core/errors';
import { http, type HttpRequest } from '@/core/http';
import { cacheGet, cacheKeys, cachePut } from '@/data/local/cache';
import type {
  Chart,
  DiaryEntry,
  ListeningContext,
  Mood,
  PomodoroSessionInput,
  PomodoroStats,
  Profile,
  Recommendations,
  Song,
} from '@/domain/types';
import { diaryFromRow, profileFromRow, songFromRow, type ProfileRow, type SongRow, type TagRow } from './mappers';

/** Data that may come from the local cache when the device is offline (FR-10). */
export type WithSource<T> = T & { fromCache: boolean; updatedAt: number };

const baseQuery: BaseQueryFn<HttpRequest, unknown, AppError> = async (req) => {
  const res = await http<unknown>(req);
  return 'error' in res ? { error: res.error } : { data: res.data };
};

/** Network first; on a connection problem, the cached copy is returned with its timestamp. */
async function networkThenCache<T>(key: string, req: HttpRequest, map: (raw: unknown) => T) {
  const res = await http<unknown>(req);
  if (!('error' in res)) {
    const data = map(res.data);
    const now = Date.now();
    await cachePut(key, data, now);
    return { data: { ...data, fromCache: false, updatedAt: now } as WithSource<T> };
  }
  if (isOfflineError(res.error)) {
    const cached = await cacheGet<T>(key);
    if (cached) return { data: { ...cached.data, fromCache: true, updatedAt: cached.updatedAt } as WithSource<T> };
  }
  return { error: res.error };
}

const enc = encodeURIComponent;
const DIARY_DAYS = 90;
export const PAGE_SIZE = 20;

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Chart', 'Diary', 'Recs', 'Profile', 'PomodoroStats'],
  endpoints: (b) => ({
    // API-04 search and browse; FR-18 optional mood filter on community tags (song_mood_stats)
    songs: b.query<{ items: Song[]; total: number; offset: number }, { q: string; offset: number; mood?: Mood | null }>(
      {
        async queryFn({ q, offset, mood }) {
          const term = q.trim().replace(/[,()*]/g, ' ');
          const filter = term.length >= 2 ? `&or=(title.ilike.*${enc(term)}*,artist_name.ilike.*${enc(term)}*)` : '';
          // an inner embed keeps only songs that the community has tagged with the mood
          const select = mood ? `*,song_mood_stats!inner(mood_code)&song_mood_stats.mood_code=eq.${mood}` : '*';
          const res = await http<SongRow[]>({
            url: `${restBaseUrl()}/songs?select=${select}&order=title.asc,id.asc&limit=${PAGE_SIZE}&offset=${offset}${filter}`,
            headers: { Prefer: 'count=exact' },
          });
          if ('error' in res) return { error: res.error };
          const total = Number(res.headers.get('content-range')?.split('/')[1] ?? res.data.length);
          return { data: { items: res.data.map(songFromRow), total, offset } };
        },
        serializeQueryArgs: ({ queryArgs }) => `${queryArgs.q.trim().toLowerCase()}|${queryArgs.mood ?? ''}`,
        merge: (cache, page) => {
          if (page.offset === 0) return page;
          const seen = new Set(cache.items.map((s) => s.id));
          return { ...page, items: [...cache.items, ...page.items.filter((s) => !seen.has(s.id))] };
        },
        forceRefetch: ({ currentArg, previousArg }) =>
          currentArg?.offset !== previousArg?.offset || currentArg?.mood !== previousArg?.mood,
      },
    ),

    // API-06 recommendations
    recommendations: b.query<WithSource<Recommendations>, { mood: Mood; context: ListeningContext | null }>({
      queryFn: ({ mood, context }) =>
        networkThenCache<Recommendations>(
          cacheKeys.recs(mood, context),
          {
            url: `${apiBaseUrl()}/recommendations?mood=${mood}${context ? `&context=${context}` : ''}&limit=20`,
          },
          (raw) => raw as Recommendations,
        ),
      providesTags: ['Recs'],
      keepUnusedDataFor: 30 * 60,
    }),

    // API-10 chart
    chart: b.query<WithSource<Chart>, Mood>({
      queryFn: (mood) =>
        networkThenCache<Chart>(
          cacheKeys.chart(mood),
          { url: `${apiBaseUrl()}/charts/${mood}?period=week` },
          (raw) => raw as Chart,
        ),
      providesTags: (_r, _e, mood) => [{ type: 'Chart', id: mood }],
      keepUnusedDataFor: 15 * 60,
    }),

    // API-09 diary (own tags only, row-level security)
    diary: b.query<WithSource<{ entries: DiaryEntry[] }>, void>({
      queryFn: () => {
        const since = new Date(Date.now() - DIARY_DAYS * 86_400_000).toISOString();
        return networkThenCache<{ entries: DiaryEntry[] }>(
          cacheKeys.diary(),
          {
            url:
              `${restBaseUrl()}/mood_tags?select=song_id,mood_code,context,note,created_at,songs(*)` +
              `&created_at=gte.${enc(since)}&order=created_at.desc&limit=500`,
          },
          (raw) => ({ entries: (raw as TagRow[]).map(diaryFromRow) }),
        );
      },
      providesTags: ['Diary'],
    }),

    // API-05 profile
    profile: b.query<Profile, string>({
      query: (uid) => ({ url: `${restBaseUrl()}/profiles?id=eq.${uid}&select=id,display_name,daily_goal_min` }),
      transformResponse: (rows: ProfileRow[]) => profileFromRow(rows[0]),
      providesTags: ['Profile'],
    }),
    updateProfile: b.mutation<Profile, { uid: string; displayName?: string; dailyGoalMin?: number }>({
      query: ({ uid, displayName, dailyGoalMin }) => ({
        url: `${restBaseUrl()}/profiles?id=eq.${uid}`,
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: {
          ...(displayName !== undefined ? { display_name: displayName } : {}),
          ...(dailyGoalMin !== undefined ? { daily_goal_min: dailyGoalMin } : {}),
        },
      }),
      transformResponse: (rows: ProfileRow[]) => profileFromRow(rows[0]),
      async onQueryStarted({ uid, displayName, dailyGoalMin }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData('profile', uid, (p) => {
            if (displayName !== undefined) p.displayName = displayName;
            if (dailyGoalMin !== undefined) p.dailyGoalMin = dailyGoalMin;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    // community moods of a song (aggregates only), for Song info
    songMoods: b.query<{ mood: Mood; percent: number }[], number>({
      query: (songId) => ({
        url: `${restBaseUrl()}/song_mood_stats?song_id=eq.${songId}&select=mood_code,ratio&order=tag_count.desc&limit=3`,
      }),
      transformResponse: (rows: { mood_code: Mood; ratio: number }[]) =>
        rows.map((r) => ({ mood: r.mood_code, percent: Math.round(Number(r.ratio) * 100) })),
    }),

    // API-14 check-in (POST, never retried automatically)
    checkIn: b.mutation<{ id: number }, { mood: Mood; context: ListeningContext | null }>({
      query: (body) => ({ url: `${apiBaseUrl()}/checkins`, method: 'POST', body }),
    }),

    // API-11..12 Pomodoro focus sessions & statistics
    completePomodoroSession: b.mutation<PomodoroStats, PomodoroSessionInput>({
      query: (body) => ({ url: `${apiBaseUrl()}/pomodoro-sessions`, method: 'POST', body }),
      invalidatesTags: ['PomodoroStats'],
    }),
    pomodoroStats: b.query<PomodoroStats, { todayStart: string }>({
      query: ({ todayStart }) => ({
        url: `${apiBaseUrl()}/me/pomodoro-stats?todayStart=${encodeURIComponent(todayStart)}`,
      }),
      providesTags: ['PomodoroStats'],
    }),

    // API-15 delete account
    deleteAccount: b.mutation<null, void>({
      query: () => ({ url: `${apiBaseUrl()}/me`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useSongsQuery,
  useRecommendationsQuery,
  useLazyRecommendationsQuery,
  useChartQuery,
  useDiaryQuery,
  useProfileQuery,
  useUpdateProfileMutation,
  useSongMoodsQuery,
  useCheckInMutation,
  useCompletePomodoroSessionMutation,
  usePomodoroStatsQuery,
  useDeleteAccountMutation,
} = api;
