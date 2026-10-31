import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Appbar, Searchbar } from 'react-native-paper';
import { Screen } from '@/presentation/components/Screen';
import { SkeletonRow, SongRow } from '@/presentation/components/SongRow';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, space } from '@/presentation/theme/tokens';
import { useLibrary } from '@/presentation/viewmodels/useLibrary';

/** SCR-06 Library and search (FR-02). */
export default function Library() {
  const vm = useLibrary();
  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="Back" />
        <Appbar.Content title="Library" />
      </Appbar.Header>
      <View style={styles.search}>
        <Searchbar
          placeholder="Search songs or artists"
          value={vm.text}
          onChangeText={vm.setText}
          autoFocus={false}
          testID="search"
          accessibilityLabel="Search songs or artists"
        />
      </View>
      {vm.state === 'success' ? (
        <FlashList
          data={vm.items}
          keyExtractor={(s) => String(s.id)}
          onEndReached={vm.loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Txt variant="labelMedium" muted style={styles.caption}>
              {vm.query ? `${vm.total} songs` : 'Sorted A to Z'}
            </Txt>
          }
          ListFooterComponent={vm.loadingMore ? <ActivityIndicator style={styles.more} /> : null}
          contentContainerStyle={{ paddingBottom: MINI_PLAYER_SPACE }}
          renderItem={({ item, index }) => (
            <SongRow song={item} active={item.id === vm.currentId} onPress={() => void vm.play(index)} />
          )}
        />
      ) : null}
      {vm.state === 'loading' ? Array.from({ length: 8 }, (_, k) => <SkeletonRow key={k} />) : null}
      {vm.state === 'empty' ? (
        <StatePanel
          icon="magnify-close"
          title={`No results for "${vm.query}"`}
          body="Check the spelling or try a different title or artist."
          action="Clear search"
          onAction={vm.clear}
          testID="search-empty"
        />
      ) : null}
      {vm.state === 'error' || vm.state === 'offline' ? (
        <StatePanel
          icon="alert-circle-outline"
          title="Couldn't load songs"
          body="Check your connection and try again."
          action="Try again"
          onAction={vm.retry}
          testID="search-error"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.background },
  search: { paddingHorizontal: space.margin, paddingBottom: space.tight },
  caption: { paddingHorizontal: space.margin, paddingVertical: space.tight },
  more: { padding: space.group },
});
