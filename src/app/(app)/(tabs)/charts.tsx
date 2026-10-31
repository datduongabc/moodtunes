import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button } from 'react-native-paper';
import { MOODS } from '@/domain/moods';
import { InfoNote } from '@/presentation/components/InfoNote';
import { MoodChip } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { SkeletonRow, SongRow } from '@/presentation/components/SongRow';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, space } from '@/presentation/theme/tokens';
import { useCharts } from '@/presentation/viewmodels/useCharts';

/** SCR-10 Mood charts. */
export default function Charts() {
  const vm = useCharts();
  const header = (
    <View style={styles.head}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Txt variant="headlineSmall" accessibilityRole="header">
            Top {vm.label}
          </Txt>
          <Txt muted>Top 20 this week</Txt>
        </View>
        {vm.entries.length > 0 ? (
          <Pressable
            onPress={() => void vm.playAll()}
            style={styles.playAll}
            accessibilityRole="button"
            accessibilityLabel={`Play all, top ${vm.label}`}
            testID="play-chart"
          >
            <MaterialCommunityIcons name="play" size={24} color={color.onPrimary} />
          </Pressable>
        ) : null}
      </View>
      {vm.isSample ? <InfoNote text="Not enough votes this week, so popular picks fill the chart" /> : null}
    </View>
  );

  return (
    <Screen offlineText={vm.offlineText}>
      <Appbar.Header style={styles.bar}>
        <Appbar.Content title="Mood charts" />
      </Appbar.Header>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selector}
        style={styles.selectorWrap}
      >
        {MOODS.map((m) => (
          <MoodChip key={m.code} mood={m.code} selected={vm.mood === m.code} onPress={() => vm.setMood(m.code)} />
        ))}
      </ScrollView>
      {vm.state === 'success' ? (
        <FlashList
          data={vm.entries}
          keyExtractor={(e) => `${e.rank}-${e.song.id}`}
          ListHeaderComponent={header}
          ListFooterComponent={
            vm.updatedText ? (
              <Txt variant="bodySmall" muted style={styles.updated}>
                {vm.updatedText}
              </Txt>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} />}
          contentContainerStyle={{ paddingBottom: MINI_PLAYER_SPACE }}
          renderItem={({ item, index }) => {
            const voted = vm.voted(item.song.id, item.myVote);
            return (
              <SongRow
                song={item.song}
                onPress={() => void vm.playAll(index)}
                subtitle={`${item.song.artistName} · ${item.votes} votes`}
                leading={
                  <Txt variant="titleMedium" style={styles.rank}>
                    {item.rank}
                  </Txt>
                }
                trailing={
                  <Button
                    compact
                    mode={voted ? 'contained-tonal' : 'outlined'}
                    icon={voted ? 'check' : undefined}
                    onPress={() => void vm.vote(item.song.id, item.myVote)}
                    accessibilityLabel={`${voted ? 'Voted' : 'Vote'} for ${item.song.title}`}
                  >
                    {voted ? 'Voted' : 'Vote'}
                  </Button>
                }
              />
            );
          }}
        />
      ) : (
        <View style={styles.flex}>
          {header}
          {vm.state === 'loading' ? Array.from({ length: 6 }, (_, k) => <SkeletonRow key={k} />) : null}
          {vm.state === 'empty' ? (
            <StatePanel
              icon="chart-bar"
              title="No songs in this chart yet"
              body="Tag songs with this mood to fill it."
            />
          ) : null}
          {vm.state === 'error' || vm.state === 'offline' ? (
            <StatePanel
              icon="alert-circle-outline"
              title="Couldn't load the chart"
              body="Check your connection and try again."
              action="Try again"
              onAction={vm.refresh}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { backgroundColor: color.background },
  selectorWrap: { flexGrow: 0 },
  selector: { gap: space.tight, paddingHorizontal: space.margin, paddingBottom: space.tight },
  head: { gap: space.grid, paddingHorizontal: space.margin, paddingVertical: space.tight },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.group },
  playAll: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: { width: 24, textAlign: 'center' },
  updated: { textAlign: 'center', padding: space.group },
});
