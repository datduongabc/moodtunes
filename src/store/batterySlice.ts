import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { initialBattery, type BatteryState } from '@/domain/battery';
import { api } from '@/data/remote/api';

export const batterySlice = createSlice({
  name: 'battery',
  initialState: initialBattery(Date.now()) as BatteryState,
  reducers: {
    set: (_s, a: PayloadAction<BatteryState>) => a.payload,
    goalChanged: (s, a: PayloadAction<number>) => {
      s.goalMin = a.payload;
      s.warned20 = false;
      s.warned0 = false;
    },
  },
  extraReducers: (b) => {
    // the daily goal is stored in the profile (AC-08.1.2)
    b.addMatcher(api.endpoints.profile.matchFulfilled, (s, a) => {
      if (s.goalMin !== a.payload.dailyGoalMin) s.goalMin = a.payload.dailyGoalMin;
    });
  },
});
export const batteryActions = batterySlice.actions;
