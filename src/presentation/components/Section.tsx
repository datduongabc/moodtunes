import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../theme/tokens';
import { Txt } from './Txt';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Txt variant="titleMedium" style={styles.flex} accessibilityRole="header">
        {title}
      </Txt>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.margin, minHeight: 48 },
  flex: { flex: 1 },
});
