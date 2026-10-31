import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { color, radius, space } from '../theme/tokens';
import { Txt } from './Txt';

export function InfoNote({ text }: { text: string }) {
  return (
    <View style={styles.note}>
      <MaterialCommunityIcons name="information-outline" size={18} color={color.onSurfaceVariant} />
      <Txt variant="bodySmall" muted style={styles.text}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: space.tight,
    padding: space.grid,
    borderRadius: radius.medium,
    backgroundColor: color.container,
    alignItems: 'flex-start',
  },
  text: { flex: 1 },
});
