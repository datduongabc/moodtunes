import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ListeningContext, Mood } from '@/domain/types';
import { api } from '@/data/remote/api';

export type LocalTag = { note: string | null; context: ListeningContext | null; createdAt: string; pending: boolean };
type TagsState = { bySong: Record<number, Partial<Record<Mood, LocalTag>>> };

/** The listener's own tags, updated optimistically so a tap shows within 200 ms (AC-04.1.1). */
export const tagsSlice = createSlice({
  name: 'tags',
  initialState: { bySong: {} } as TagsState,
  reducers: {
    tagSet: (s, a: PayloadAction<{ songId: number; mood: Mood; tag: LocalTag }>) => {
      s.bySong[a.payload.songId] = { ...s.bySong[a.payload.songId], [a.payload.mood]: a.payload.tag };
    },
    tagRemoved: (s, a: PayloadAction<{ songId: number; mood: Mood }>) => {
      const song = s.bySong[a.payload.songId];
      if (song) delete song[a.payload.mood];
    },
    synced: (s, a: PayloadAction<{ songId: number; mood: Mood }>) => {
      const t = s.bySong[a.payload.songId]?.[a.payload.mood];
      if (t) t.pending = false;
    },
    pendingMarked: (s, a: PayloadAction<{ songId: number; mood: Mood }[]>) => {
      for (const p of a.payload) {
        const t = s.bySong[p.songId]?.[p.mood];
        if (t) t.pending = true;
      }
    },
    cleared: () => ({ bySong: {} }),
  },
  extraReducers: (b) => {
    b.addMatcher(api.endpoints.diary.matchFulfilled, (s, a) => {
      for (const e of a.payload.entries) {
        const existing = s.bySong[e.songId]?.[e.mood];
        if (existing?.pending) continue;
        s.bySong[e.songId] = {
          ...s.bySong[e.songId],
          [e.mood]: { note: e.note, context: e.context, createdAt: e.createdAt, pending: false },
        };
      }
    });
  },
});
export const tagsActions = tagsSlice.actions;
