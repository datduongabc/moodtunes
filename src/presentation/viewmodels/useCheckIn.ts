import { router } from 'expo-router';
import { useState } from 'react';
import { moodInfo } from '@/domain/moods';
import { demoteRecentlyPlayed } from '@/domain/recommendations';
import type { ListeningContext, Mood } from '@/domain/types';
import { api, useCheckInMutation, useProfileQuery } from '@/data/remote/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { moodActions } from '@/store/moodSlice';
import { playSongs } from '@/store/services';
import { uiActions } from '@/store/uiSlice';

const greeting = (h: number) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

/** View model for SCR-04 (UC-02, SD-01). */
export function useCheckIn() {
  const dispatch = useAppDispatch();
  const lastMood = useAppSelector((s) => s.mood.current);
  const lastContext = useAppSelector((s) => s.mood.context);
  const userId = useAppSelector((s) => s.session.userId);
  const playedAt = useAppSelector((s) => s.player.playedAt);
  const { data: profile } = useProfileQuery(userId ?? '', { skip: !userId });
  const [mood, setMood] = useState<Mood | null>(lastMood); // AC-05.1.4
  const [context, setContext] = useState<ListeningContext | null>(lastContext);
  const [busy, setBusy] = useState(false);
  const [recordCheckIn] = useCheckInMutation();

  const play = async () => {
    if (!mood) return;
    setBusy(true);
    dispatch(moodActions.checkedIn({ mood, context }));
    void recordCheckIn({ mood, context }); // not awaited (SD-01 step 3)
    const res = await dispatch(api.endpoints.recommendations.initiate({ mood, context }));
    setBusy(false);
    const items = res.data ? demoteRecentlyPlayed(res.data.items, playedAt, Date.now()) : [];
    if (items.length > 0)
      await playSongs(
        items.map((i) => i.song),
        0,
        `${moodInfo(mood).label} mix`,
      );
    else dispatch(uiActions.snack("Couldn't load songs. Try again"));
    router.back();
  };

  const skip = () => {
    dispatch(moodActions.checkInSkipped()); // AC-05.1.3
    router.back();
  };

  return {
    greeting: `${greeting(new Date().getHours())}${profile ? `, ${profile.displayName}` : ''}`,
    mood,
    setMood,
    context,
    setContext: (c: ListeningContext) => setContext(context === c ? null : c),
    busy,
    play,
    skip,
  };
}
