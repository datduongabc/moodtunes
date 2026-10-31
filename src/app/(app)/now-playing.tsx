import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { duration } from '@/core/time';
import { moodInfo } from '@/domain/moods';
import { MoodChip } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, radius, space, tint } from '@/presentation/theme/tokens';
import { useNowPlaying } from '@/presentation/viewmodels/useNowPlaying';

/** SCR-07 Now Playing (FR-03). */
export default function NowPlaying() {
  const vm = useNowPlaying();
  const [dragging, setDragging] = useState<number | null>(null);
  if (!vm.song) {
    return (
      <Screen edges={['top', 'bottom']}>
        <StatePanel
          icon="music-note-off"
          title="Nothing is playing"
          action="Browse songs"
          onAction={() => router.replace('/library')}
        />
      </Screen>
    );
  }
  const accent = vm.myMoods[0] ? moodInfo(vm.myMoods[0]) : null;
  const pos = dragging ?? vm.position;
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="chevron-down" onPress={() => router.back()} accessibilityLabel="Collapse player" />
        <View style={styles.topMid}>
          <Txt variant="labelSmall" muted>
            Playing from
          </Txt>
          <Txt variant="titleSmall" numberOfLines={1}>
            {vm.source || 'Library'}
          </Txt>
        </View>
        <IconButton icon="dots-vertical" onPress={() => router.push('/song-info')} accessibilityLabel="Song info" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.art, accent && { backgroundColor: tint(accent.base, 0.5) }]}>
          {vm.song.imageUrl ? (
            <Image
              source={{ uri: vm.song.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <MaterialCommunityIcons name="music-note" size={96} color={color.onSurfaceVariant} />
          )}
        </View>
        <View style={styles.info}>
          <Txt variant="headlineSmall" numberOfLines={2}>
            {vm.song.title}
          </Txt>
          <Txt variant="bodyLarge" muted numberOfLines={1}>
            {vm.song.artistName}
          </Txt>
          {vm.myMoods.length > 0 ? (
            <View style={styles.tags}>
              {vm.myMoods.map((m) => (
                <MoodChip key={m} mood={m} selected compact pending={vm.pending(m)} />
              ))}
            </View>
          ) : null}
        </View>
        <View>
          <Slider
            minimumValue={0}
            maximumValue={Math.max(1, vm.duration)}
            value={pos}
            minimumTrackTintColor={color.primary}
            maximumTrackTintColor={color.outlineVariant}
            thumbTintColor={color.primary}
            onValueChange={setDragging}
            onSlidingComplete={(v) => {
              vm.seek(v);
              setDragging(null);
            }}
            accessibilityLabel="Seek"
          />
          <View style={styles.times}>
            <Txt variant="labelMedium" muted>
              {duration(pos)}
            </Txt>
            <Txt variant="labelMedium" muted>
              {duration(vm.duration)}
            </Txt>
          </View>
        </View>
        <View style={styles.controls}>
          <IconButton icon="skip-previous" size={32} onPress={vm.previous} accessibilityLabel="Previous" />
          <Pressable
            onPress={vm.toggle}
            style={styles.play}
            accessibilityRole="button"
            accessibilityLabel={vm.isPlaying ? 'Pause' : 'Play'}
            testID="play-pause"
          >
            {vm.isBuffering ? (
              <ActivityIndicator color={color.onPrimary} size="large" />
            ) : (
              <MaterialCommunityIcons name={vm.isPlaying ? 'pause' : 'play'} size={36} color={color.onPrimary} />
            )}
          </Pressable>
          <IconButton icon="skip-next" size={32} onPress={vm.next} disabled={!vm.hasNext} accessibilityLabel="Next" />
        </View>
        <View style={styles.actions}>
          <Button mode="contained-tonal" icon="tag-outline" onPress={() => router.push('/tag-sheet')} testID="tag-mood">
            Tag mood
          </Button>
          <IconButton icon="playlist-music" onPress={() => router.push('/queue')} accessibilityLabel="Queue" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.text },
  topMid: { flex: 1, alignItems: 'center' },
  content: { padding: space.margin, gap: space.group, alignItems: 'stretch' },
  art: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    borderRadius: radius.large,
    overflow: 'hidden',
    backgroundColor: color.containerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { gap: space.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight, marginTop: space.text },
  times: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.margin },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.area },
  play: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
