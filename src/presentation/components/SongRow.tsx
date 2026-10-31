import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { duration } from '@/core/time';
import type { Song } from '@/domain/types';
import { color, radius, space } from '../theme/tokens';
import { Txt } from './Txt';

export function Cover({ uri, size = 48 }: { uri: string | null; size?: number }) {
  return (
    <Image
      source={uri ? { uri } : null}
      style={{ width: size, height: size, borderRadius: radius.small, backgroundColor: color.containerHigh }}
      contentFit="cover"
      cachePolicy="disk"
      accessible={false}
    />
  );
}

export function SongRow({
  song,
  onPress,
  leading,
  trailing,
  subtitle,
  active,
}: {
  song: Song;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  subtitle?: string;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${song.title} by ${song.artistName}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.container }]}
    >
      {leading}
      <Cover uri={song.imageUrl} />
      <View style={styles.text}>
        <Txt variant="titleSmall" numberOfLines={1} style={active ? { color: color.primary } : null}>
          {song.title}
        </Txt>
        <Txt variant="bodySmall" muted numberOfLines={1}>
          {subtitle ?? song.artistName}
        </Txt>
      </View>
      {trailing ?? (
        <Txt variant="bodySmall" muted>
          {duration(song.durationSec)}
        </Txt>
      )}
    </Pressable>
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.row} accessibilityLabel="Loading">
      <View style={[styles.block, { width: 48, height: 48 }]} />
      <View style={[styles.text, { gap: space.tight }]}>
        <View style={[styles.block, { width: '70%', height: 12 }]} />
        <View style={[styles.block, { width: '40%', height: 10 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.grid,
    paddingHorizontal: space.margin,
    minHeight: 72,
    paddingVertical: space.tight,
  },
  text: { flex: 1, minWidth: 0 },
  block: { backgroundColor: color.container, borderRadius: radius.small },
});
