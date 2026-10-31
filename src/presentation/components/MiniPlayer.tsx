import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { PlayerService } from '@/data/player/PlayerService';
import { useAppSelector } from '@/store';
import { color, radius, space } from '../theme/tokens';
import { Cover } from './SongRow';
import { Txt } from './Txt';

/** Mini-player above the navigation bar (AC-03.1.1). */
export function MiniPlayer() {
  const { queue, index, isPlaying, isBuffering, positionSec, durationSec } = useAppSelector((s) => s.player);
  const song = queue[index];
  if (!song) return null;
  const progress = durationSec > 0 ? Math.min(1, positionSec / durationSec) : 0;
  return (
    <Pressable
      onPress={() => router.push('/now-playing')}
      accessibilityRole="button"
      accessibilityLabel={`Now playing ${song.title}. Open player`}
      style={styles.wrap}
      testID="mini-player"
    >
      <View style={styles.row}>
        <Cover uri={song.imageUrl} size={40} />
        <View style={styles.text}>
          <Txt variant="titleSmall" numberOfLines={1}>
            {song.title}
          </Txt>
          <Txt variant="bodySmall" muted numberOfLines={1}>
            {song.artistName}
          </Txt>
        </View>
        {isBuffering ? (
          <MaterialCommunityIcons name="loading" size={24} color={color.onSurfaceVariant} style={styles.pad} />
        ) : null}
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          size={28}
          onPress={() => (isPlaying ? PlayerService.pause() : PlayerService.play())}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.tight,
    marginBottom: space.tight,
    borderRadius: radius.medium,
    backgroundColor: color.containerHigh,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.grid, paddingLeft: space.tight, height: 64 },
  text: { flex: 1, minWidth: 0 },
  pad: { marginRight: -space.tight },
  track: { height: 2, backgroundColor: color.outlineVariant },
  fill: { height: 2, backgroundColor: color.primary },
});
