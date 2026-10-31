import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type SessionState = { status: 'restoring' | 'signedOut' | 'signedIn'; userId: string | null; email: string | null };
const initialState: SessionState = { status: 'restoring', userId: null, email: null };

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    signedIn: (s, a: PayloadAction<{ userId: string; email: string | null }>) => {
      s.status = 'signedIn';
      s.userId = a.payload.userId;
      s.email = a.payload.email;
    },
    signedOut: () => ({ status: 'signedOut' as const, userId: null, email: null }),
  },
});
export const { signedIn, signedOut } = sessionSlice.actions;
export const sessionActions = sessionSlice.actions;
