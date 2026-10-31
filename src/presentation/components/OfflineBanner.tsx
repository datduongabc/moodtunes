import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAppSelector } from '@/store';
import { color, space } from '../theme/tokens';
import { Txt } from './Txt';

/** One offline banner per screen; a screen may pass a more specific text (AC-09.2.3). */
export function OfflineBanner({ text }: { text?: string | null }) {
  const online = useAppSelector((s) => s.network.online);
  if (online) return null;
  return (
    <View style={styles.bar} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="cloud-off-outline" size={18} color={color.onSurface} />
      <Txt variant="labelLarge" style={styles.text} numberOfLines={2}>
        {text ?? "You're offline. Showing saved data"}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    backgroundColor: color.offline,
    paddingHorizontal: space.margin,
    paddingVertical: space.tight,
    minHeight: 40,
  },
  text: { flex: 1 },
});
