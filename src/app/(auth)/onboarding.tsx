import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import type { Mood } from '@/domain/types';
import { MoodArt } from '@/presentation/components/MoodArt';
import { Screen } from '@/presentation/components/Screen';
import { Txt } from '@/presentation/components/Txt';
import { color, space } from '@/presentation/theme/tokens';
import { completeOnboarding } from '@/store/services';

const PAGES: { title: string; body: string; icon: string; mood: Mood }[] = [
  {
    title: 'Music for how you feel',
    body: 'Pick a mood and start listening in two taps.',
    icon: 'headphones',
    mood: 'focused',
  },
  {
    title: 'See what fits each mood',
    body: 'Charts show the songs listeners tag most for each mood this week.',
    icon: 'chart-bar',
    mood: 'happy',
  },
  {
    title: 'Listen at a healthy pace',
    body: 'Set a daily goal. The listening battery shows how much time is left.',
    icon: 'battery-70',
    mood: 'relaxed',
  },
];

/** SCR-01 Onboarding (FR-19). */
export default function Onboarding() {
  const [i, setI] = useState(0);
  const page = PAGES[i];
  const finish = (to: '/sign-in' | '/sign-up') => {
    completeOnboarding();
    router.replace(to);
  };
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Button onPress={() => finish('/sign-in')}>Skip</Button>
      </View>
      <View style={styles.content}>
        <MoodArt mood={page.mood} icon={page.icon} size={232} />
        <View style={styles.text}>
          <Txt variant="headlineMedium" style={styles.center} accessibilityRole="header">
            {page.title}
          </Txt>
          <Txt variant="bodyLarge" muted style={styles.center}>
            {page.body}
          </Txt>
        </View>
        <View style={styles.dots} accessibilityLabel={`Page ${i + 1} of 3`}>
          {PAGES.map((_, k) => (
            <View key={k} style={[styles.dot, k === i && styles.dotActive]} />
          ))}
        </View>
      </View>
      <View style={styles.bottom}>
        <Button mode="contained" onPress={() => (i < 2 ? setI(i + 1) : finish('/sign-up'))}>
          {i < 2 ? 'Next' : 'Get started'}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'flex-end', paddingHorizontal: space.tight },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.area,
    paddingHorizontal: space.margin,
  },
  text: { gap: space.tight },
  center: { textAlign: 'center' },
  dots: { flexDirection: 'row', gap: space.tight },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.outline },
  dotActive: { width: 24, backgroundColor: color.primary },
  bottom: { padding: space.margin },
});
