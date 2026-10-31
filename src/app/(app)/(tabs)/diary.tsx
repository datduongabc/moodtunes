import { router } from 'expo-router';
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { Appbar, Chip } from 'react-native-paper';
import { hhmm } from '@/core/time';
import { MOODS } from '@/domain/moods';
import { MoodChip } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { Cover, SkeletonRow } from '@/presentation/components/SongRow';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, space } from '@/presentation/theme/tokens';
import { useDiary } from '@/presentation/viewmodels/useDiary';

/** SCR-11 Mood diary. */
export default function Diary() {
  const vm = useDiary();
  return (
    <Screen offlineText={vm.offlineText}>
      <Appbar.Header style={styles.bar}>
        <Appbar.Content title="Mood diary" />
      </Appbar.Header>
      {vm.state !== 'empty' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersWrap}
          contentContainerStyle={styles.filters}
        >
          <Chip selected={vm.filter === null} showSelectedOverlay onPress={() => vm.setFilter(null)}>
            All moods
          </Chip>
          {MOODS.map((m) => (
            <MoodChip
              key={m.code}
              mood={m.code}
              selected={vm.filter === m.code}
              onPress={() => vm.setFilter(vm.filter === m.code ? null : m.code)}
            />
          ))}
        </ScrollView>
      ) : null}
      {vm.state === 'success' ? (
        <SectionList
          sections={vm.days.map((d) => ({ title: d.label, data: d.entries }))}
          keyExtractor={(e) => `${e.songId}:${e.mood}`}
          refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} />}
          contentContainerStyle={{ paddingBottom: MINI_PLAYER_SPACE }}
          ListEmptyComponent={<StatePanel icon="filter-off-outline" title="No tags with this mood" />}
          renderSectionHeader={({ section }) => (
            <Txt variant="titleSmall" muted style={styles.day} accessibilityRole="header">
              {section.title}
            </Txt>
          )}
          renderItem={({ item }) => (
            <View
              style={styles.entry}
              accessible
              accessibilityLabel={`${item.song.title}, ${item.mood}${item.note ? `, note: ${item.note}` : ''}${item.pending ? ', waiting to sync' : ''}`}
            >
              <Cover uri={item.song.imageUrl} />
              <View style={styles.text}>
                <Txt variant="titleSmall" numberOfLines={1}>
                  {item.song.title}
                </Txt>
                <Txt variant="bodySmall" muted numberOfLines={1}>
                  {item.song.artistName}
                </Txt>
                {item.note ? (
                  <Txt variant="bodyMedium" numberOfLines={3} style={styles.note}>{`"${item.note}"`}</Txt>
                ) : null}
                <View style={styles.meta}>
                  <MoodChip mood={item.mood} selected compact />
                  <Txt variant="labelMedium" muted>
                    {item.pending ? 'Waiting to sync' : hhmm(item.createdAt)}
                  </Txt>
                </View>
              </View>
            </View>
          )}
        />
      ) : null}
      {vm.state === 'loading' ? Array.from({ length: 6 }, (_, k) => <SkeletonRow key={k} />) : null}
      {vm.state === 'empty' ? (
        <StatePanel
          icon="book-open-blank-variant"
          title="Your diary is empty"
          body="Tag a song to record how it made you feel. Each tag is saved with the date and your note."
          action="Browse songs"
          onAction={() => router.push('/library')}
          testID="diary-empty"
        />
      ) : null}
      {vm.state === 'error' || vm.state === 'offline' ? (
        <StatePanel
          icon="alert-circle-outline"
          title="Couldn't load your diary"
          body="Check your connection and try again."
          action="Try again"
          onAction={vm.refresh}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.background },
  filtersWrap: { flexGrow: 0 },
  filters: { gap: space.tight, paddingHorizontal: space.margin, paddingBottom: space.tight, alignItems: 'center' },
  day: {
    paddingHorizontal: space.margin,
    paddingTop: space.group,
    paddingBottom: space.tight,
    backgroundColor: color.background,
  },
  entry: { flexDirection: 'row', gap: space.grid, paddingHorizontal: space.margin, paddingVertical: space.grid },
  text: { flex: 1, gap: space.text },
  note: { fontStyle: 'italic' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.tight, marginTop: space.text },
});
