import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { moodInfo } from '@/domain/moods';
import type { Mood } from '@/domain/types';
import { color, radius, space, tint, TOUCH } from '../theme/tokens';
import { Txt } from './Txt';

/** A mood is always shown with its icon and label, never by colour alone (NFR-ACC-01). */
export function MoodIcon({ mood, size = 20 }: { mood: Mood; size?: number }) {
  const m = moodInfo(mood);
  return <MaterialCommunityIcons name={m.icon as never} size={size} color={m.color} />;
}

export function MoodChip({
  mood,
  selected,
  onPress,
  pending,
  compact,
}: {
  mood: Mood;
  selected?: boolean;
  onPress?: () => void;
  pending?: boolean;
  compact?: boolean;
}) {
  const m = moodInfo(mood);
  const body = (
    <View
      style={[
        styles.chip,
        compact && styles.compact,
        selected ? { backgroundColor: tint(m.color), borderColor: m.color } : null,
      ]}
    >
      <MoodIcon mood={mood} size={compact ? 16 : 20} />
      <Txt variant={compact ? 'labelMedium' : 'labelLarge'}>{m.label}</Txt>
      {pending ? <MaterialCommunityIcons name="clock-outline" size={14} color={color.onSurfaceVariant} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={`${m.label}${pending ? ', waiting to sync' : ''}`}
      hitSlop={4}
      style={styles.touch}
    >
      {body}
    </Pressable>
  );
}

/** Large tile used on the check-in screen and in the game (8 moods in a 2-column grid). */
export function MoodTile({
  mood,
  selected,
  onPress,
  disabled,
}: {
  mood: Mood;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const m = moodInfo(mood);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, disabled }}
      accessibilityLabel={m.label}
      style={({ pressed }) => [
        styles.tile,
        selected && { borderColor: m.color, backgroundColor: tint(m.color) },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconBg, { backgroundColor: m.color }]}>
        <MaterialCommunityIcons name={m.icon as never} size={22} color={color.inverse} />
      </View>
      <Txt variant="titleSmall" numberOfLines={1} style={styles.flex}>
        {m.label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { minHeight: TOUCH, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    paddingHorizontal: space.grid,
    height: 40,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: color.outline,
  },
  compact: { height: 28, paddingHorizontal: space.tight, gap: space.text },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.grid,
    padding: space.grid,
    minHeight: 64,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.container,
  },
  iconBg: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
