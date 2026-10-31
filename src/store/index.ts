import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '@/data/remote/api';
import { batterySlice } from './batterySlice';
import { moodSlice } from './moodSlice';
import { networkSlice } from './networkSlice';
import { playerSlice } from './playerSlice';
import { sessionSlice } from './sessionSlice';
import { tagsSlice } from './tagsSlice';
import { uiSlice } from './uiSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    session: sessionSlice.reducer,
    mood: moodSlice.reducer,
    player: playerSlice.reducer,
    battery: batterySlice.reducer,
    network: networkSlice.reducer,
    tags: tagsSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (gdm) => gdm().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
