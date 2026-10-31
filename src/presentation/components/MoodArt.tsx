import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { moodInfo } from '@/domain/moods';
import type { Mood } from '@/domain/types';
import { color, tint } from '../theme/tokens';

/** Circular mood artwork used on onboarding and the brand mark. */
export function MoodArt({ mood, icon, size }: { mood: Mood; icon: string; size: number }) {
  const m = moodInfo(mood);
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint(m.base, 0.35),
        borderWidth: 1,
        borderColor: tint(m.color, 0.5),
      }}
    >
      <MaterialCommunityIcons name={icon as never} size={size * 0.42} color={color.onSurface} />
    </View>
  );
}
