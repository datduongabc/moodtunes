import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '../theme/tokens';
import { useBattery } from '../viewmodels/useBattery';
import { Txt } from './Txt';

export const levelColor = { normal: color.success, low: color.warning, empty: color.error } as const;

export function BatteryCard() {
  const b = useBattery();
  return (
    <Pressable
      onPress={() => router.push('/battery')}
      accessibilityRole="button"
      accessibilityLabel={`Listening battery, ${b.cardText}`}
      style={styles.card}
      testID="battery-card"
    >
      <MaterialCommunityIcons name="battery-heart-variant" size={24} color={levelColor[b.level]} />
      <View style={styles.text}>
        <Txt variant="labelMedium" muted>
          Listening battery
        </Txt>
        <Txt variant="titleSmall">{b.cardText}</Txt>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${b.percent}%`, backgroundColor: levelColor[b.level] }]} />
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={color.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.grid,
    padding: space.group,
    borderRadius: radius.large,
    backgroundColor: color.container,
  },
  text: { flex: 1, gap: space.text },
  track: { height: 4, borderRadius: 2, backgroundColor: color.outlineVariant, marginTop: space.text },
  fill: { height: 4, borderRadius: 2 },
});
