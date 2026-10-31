import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { color } from '../theme/tokens';
import { OfflineBanner } from './OfflineBanner';

/** Screen frame: background, safe area and the single offline banner (AC-10.1.1). */
export function Screen({
  children,
  edges = ['top'],
  offlineText,
}: {
  children: ReactNode;
  edges?: Edge[];
  offlineText?: string | null;
}) {
  return (
    <SafeAreaView edges={edges} style={styles.root}>
      <OfflineBanner text={offlineText} />
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  body: { flex: 1 },
});
