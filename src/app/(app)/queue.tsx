import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Appbar, IconButton, Snackbar } from 'react-native-paper';
import type { Song } from '@/domain/types';
import { Screen } from '@/presentation/components/Screen';
import { SongRow } from '@/presentation/components/SongRow';
import { SectionHeader } from '@/presentation/components/Section';
import { StatePanel } from '@/presentation/components/StatePanel';
import { color, space } from '@/presentation/theme/tokens';
import { useAppSelector } from '@/store';
import { playSongs, removeFromQueue } from '@/store/services';

/** SCR-08 Queue (AC-03.3.2): swipe left or tap × to remove; Undo in the snackbar. */
export default function Queue() {
  const { queue, index, source } = useAppSelector((s) => s.player);
  const [removed, setRemoved] = useState<{ song: Song; at: number } | null>(null);
  const current = queue[index];
  const upNext = queue.slice(index + 1);

  const remove = (qi: number) => {
    setRemoved({ song: queue[qi], at: qi });
    removeFromQueue(qi);
  };
  const undo = () => {
    if (!removed || !current) return;
    const list = [...queue];
    list.splice(removed.at, 0, removed.song);
    // re-create the playlist from the current song so the order is restored
    void playSongs(list.slice(index), 0, source);
    setRemoved(null);
  };

  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="Back" />
        <Appbar.Content title="Queue" />
      </Appbar.Header>
      {upNext.length === 0 ? (
        <StatePanel
          icon="playlist-music-outline"
          title="Your queue is empty"
          body="Play a song from a list and the songs after it will appear here."
          action="Browse songs"
          onAction={() => router.replace('/library')}
        />
      ) : (
        <FlatList
          data={upNext}
          keyExtractor={(s, i) => `${s.id}-${i}`}
          ListHeaderComponent={
            <View>
              {current ? (
                <>
                  <SectionHeader title="Now playing" />
                  <SongRow song={current} active />
                </>
              ) : null}
              <SectionHeader title="Up next" />
            </View>
          }
          renderItem={({ item, index: i }) => (
            <Swipeable
              friction={2}
              rightThreshold={80}
              renderRightActions={() => <View style={styles.swipeLane} />}
              onSwipeableOpen={() => remove(index + 1 + i)}
            >
              <View style={styles.rowBg}>
                <SongRow
                  song={item}
                  trailing={
                    <IconButton
                      icon="close"
                      onPress={() => remove(index + 1 + i)}
                      accessibilityLabel={`Remove ${item.title}`}
                    />
                  }
                />
              </View>
            </Swipeable>
          )}
        />
      )}
      <Snackbar visible={!!removed} onDismiss={() => setRemoved(null)} action={{ label: 'Undo', onPress: undo }}>
        Removed from queue
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.background },
  rowBg: { backgroundColor: color.background },
  swipeLane: { width: 96, backgroundColor: color.errorContainer, marginLeft: space.tight },
});
