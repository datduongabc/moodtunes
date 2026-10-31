import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const networkSlice = createSlice({
  name: 'network',
  initialState: { online: true, syncing: false },
  reducers: {
    changed: (s, a: PayloadAction<boolean>) => {
      s.online = a.payload;
    },
    syncing: (s, a: PayloadAction<boolean>) => {
      s.syncing = a.payload;
    },
  },
});
export const networkActions = networkSlice.actions;
