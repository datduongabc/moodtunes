import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Snack = { id: number; text: string };
type UiState = {
  snack: Snack | null;
  onboarded: boolean;
  batteryBanner: 'low' | 'empty' | null; // AC-08.1.3
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState: { snack: null, onboarded: false, batteryBanner: null } as UiState,
  reducers: {
    snack: (s, a: PayloadAction<string>) => {
      s.snack = { id: Date.now(), text: a.payload };
    },
    snackDismissed: (s) => {
      s.snack = null;
    },
    batteryBanner: (s, a: PayloadAction<'low' | 'empty' | null>) => {
      s.batteryBanner = a.payload;
    },
    onboarded: (s, a: PayloadAction<boolean>) => {
      s.onboarded = a.payload;
    },
  },
});
export const uiActions = uiSlice.actions;
