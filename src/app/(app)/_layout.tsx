import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { color } from '@/presentation/theme/tokens';
import { useAppSelector } from '@/store';

export default function AppLayout() {
  const checkInDue = useAppSelector((s) => s.mood.checkInDue);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);

  // AC-05.1.1 / AC-05.1.5: show the check-in on start and after 30 minutes in the background, not while playing
  useEffect(() => {
    if (checkInDue && !isPlaying) {
      const t = setTimeout(() => router.push('/check-in'), 0);
      return () => clearTimeout(t);
    }
  }, [checkInDue, isPlaying]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="now-playing" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="queue" />
      <Stack.Screen name="library" />
      <Stack.Screen name="battery" />
      <Stack.Screen name="game-play" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="tag-sheet"
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }}
      />
      <Stack.Screen
        name="song-info"
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5], sheetGrabberVisible: true }}
      />
    </Stack>
  );
}
