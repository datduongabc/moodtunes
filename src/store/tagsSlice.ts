import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ListeningContext, Mood } from '@/domain/types';
import { api } from '@/data/remote/api';

export type LocalTag = { note: string | null; context: ListeningContext | null; createdAt: string; pending: boolean };
type TagsState = {
  bySong: Record<number, Partial<Record<Mood, LocalTag>>>;
  pendingDeletes: Record<number, Partial<Record<Mood, true>>>;
};

/** The listener's own tags, updated optimistically so a tap shows within 200 ms (AC-04.1.1). */
export const tagsSlice = createSlice({
  name: 'tags',
  initialState: { bySong: {}, pendingDeletes: {} } as TagsState,
  reducers: {
    tagSet: (s, a: PayloadAction<{ songId: number; mood: Mood; tag: LocalTag }>) => {
      s.bySong[a.payload.songId] = { ...s.bySong[a.payload.songId], [a.payload.mood]: a.payload.tag };
      if (s.pendingDeletes[a.payload.songId]) delete s.pendingDeletes[a.payload.songId]![a.payload.mood];
    },
    tagRemoved: (s, a: PayloadAction<{ songId: number; mood: Mood; pending?: boolean }>) => {
      const song = s.bySong[a.payload.songId];
      if (song) delete song[a.payload.mood];
      if (a.payload.pending) {
        s.pendingDeletes[a.payload.songId] = { ...s.pendingDeletes[a.payload.songId], [a.payload.mood]: true };
      } else if (s.pendingDeletes[a.payload.songId]) {
        delete s.pendingDeletes[a.payload.songId]![a.payload.mood];
      }
    },
    synced: (s, a: PayloadAction<{ songId: number; mood: Mood }>) => {
      const t = s.bySong[a.payload.songId]?.[a.payload.mood];
      if (t) t.pending = false;
      if (s.pendingDeletes[a.payload.songId]) delete s.pendingDeletes[a.payload.songId]![a.payload.mood];
    },
    pendingMarked: (s, a: PayloadAction<{ songId: number; mood: Mood }[]>) => {
      for (const p of a.payload) {
        const t = s.bySong[p.songId]?.[p.mood];
        if (t) t.pending = true;
      }
    },
    cleared: () => ({ bySong: {}, pendingDeletes: {} }),
  },
  extraReducers: (b) => {
    b.addMatcher(api.endpoints.diary.matchFulfilled, (s, a) => {
      for (const e of a.payload.entries) {
        const existing = s.bySong[e.songId]?.[e.mood];
        if (existing?.pending || s.pendingDeletes[e.songId]?.[e.mood]) continue;
        s.bySong[e.songId] = {
          ...s.bySong[e.songId],
          [e.mood]: { note: e.note, context: e.context, createdAt: e.createdAt, pending: false },
        };
      }
    });
  },
});
export const tagsActions = tagsSlice.actions;
