import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Song } from '@/domain/types';

export type PlayerState = {
  queue: Song[];
  source: string; // "Playing from" label
  index: number;
  isPlaying: boolean;
  isBuffering: boolean;
  positionSec: number;
  durationSec: number;
  error: string | null;
  playedAt: Record<number, number>; // last play time per song, for AC-06.1.3
  recent: Song[]; // metadata of the last 50 played songs (AC-10.1.5)
};

const initialState: PlayerState = {
  queue: [],
  source: '',
  index: 0,
  isPlaying: false,
  isBuffering: false,
  positionSec: 0,
  durationSec: 0,
  error: null,
  playedAt: {},
  recent: [],
};

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    queueSet: (s, a: PayloadAction<{ queue: Song[]; index: number; source: string }>) => {
      s.queue = a.payload.queue;
      s.source = a.payload.source;
      s.index = a.payload.index;
      s.positionSec = 0;
      s.error = null;
    },
    indexChanged: (s, a: PayloadAction<{ index: number; now: number }>) => {
      s.index = a.payload.index;
      s.positionSec = 0;
      const song = s.queue[a.payload.index];
      if (song) {
        s.playedAt[song.id] = a.payload.now;
        s.recent = [song, ...s.recent.filter((r) => r.id !== song.id)].slice(0, 50);
      }
    },
    removedAt: (s, a: PayloadAction<number>) => {
      s.queue.splice(a.payload, 1);
      if (a.payload < s.index) s.index -= 1;
    },
    status: (
      s,
      a: PayloadAction<
        Partial<Pick<PlayerState, 'isPlaying' | 'isBuffering' | 'positionSec' | 'durationSec' | 'error'>>
      >,
    ) => {
      Object.assign(s, a.payload);
    },
    restored: (s, a: PayloadAction<Partial<PlayerState>>) => ({
      ...s,
      ...a.payload,
      isPlaying: false,
      isBuffering: false,
    }),
    cleared: () => initialState,
  },
});
export const playerActions = playerSlice.actions;
