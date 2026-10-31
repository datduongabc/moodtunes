import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ListeningContext, Mood } from '@/domain/types';

type MoodState = {
  current: Mood | null;
  context: ListeningContext | null;
  checkInDue: boolean; // AC-05.1.1
  backgroundSince: number | null;
};
const initialState: MoodState = { current: null, context: null, checkInDue: true, backgroundSince: null };

export const moodSlice = createSlice({
  name: 'mood',
  initialState,
  reducers: {
    restored: (s, a: PayloadAction<{ mood: Mood | null; context: ListeningContext | null }>) => {
      s.current = a.payload.mood;
      s.context = a.payload.context;
    },
    checkedIn: (s, a: PayloadAction<{ mood: Mood; context: ListeningContext | null }>) => {
      s.current = a.payload.mood;
      s.context = a.payload.context;
      s.checkInDue = false;
    },
    checkInSkipped: (s) => {
      s.checkInDue = false;
    },
    checkInRequired: (s) => {
      s.checkInDue = true;
    },
    wentBackground: (s, a: PayloadAction<number>) => {
      s.backgroundSince = a.payload;
    },
    cameForeground: (s) => {
      s.backgroundSince = null;
    },
  },
});
export const moodActions = moodSlice.actions;
