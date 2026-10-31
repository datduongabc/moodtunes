import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { CONTEXTS, moodInfo } from '@/domain/moods';
import { BatteryBanner } from '@/presentation/components/BatteryBanner';
import { BatteryCard } from '@/presentation/components/BatteryCard';
import { InfoNote } from '@/presentation/components/InfoNote';
import { MoodChip } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { SkeletonRow, SongRow } from '@/presentation/components/SongRow';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, space } from '@/presentation/theme/tokens';
import { useHome } from '@/presentation/viewmodels/useHome';

/** SCR-05 Home. */
export default function Home() {
  const vm = useHome();
  const label = vm.mood ? moodInfo(vm.mood).label : null;
  const ctx = CONTEXTS.find((c) => c.code === vm.context);

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="labelMedium" muted>
            Your mood
          </Txt>
          <View style={styles.chips}>
            {vm.mood ? <MoodChip mood={vm.mood} selected compact /> : <Txt variant="titleSmall">Not set</Txt>}
            {ctx ? <Chip compact>{ctx.label}</Chip> : null}
          </View>
        </View>
        <Button onPress={() => router.push('/check-in')}>Change</Button>
      </View>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.push('/library')}
          accessibilityRole="search"
          style={styles.search}
          accessibilityLabel="Search songs or artists"
        >
          <MaterialCommunityIcons name="magnify" size={24} color={color.onSurfaceVariant} />
          <Txt variant="bodyLarge" muted>
            Search songs or artists
          </Txt>
        </Pressable>
        <BatteryBanner />
        <BatteryCard />
      </View>
      {label ? (
        <View style={styles.sectionHead}>
          <Txt variant="titleMedium" accessibilityRole="header">
            Picked for {label}
          </Txt>
          {vm.isSample ? <InfoNote text={`Few songs are tagged ${label} yet, so these are popular picks`} /> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      {vm.state === 'success' ? (
        <FlashList
          data={vm.items}
          keyExtractor={(i) => String(i.song.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: MINI_PLAYER_SPACE }}
          renderItem={({ item, index }) => (
            <SongRow song={item.song} active={item.song.id === vm.currentId} onPress={() => void vm.play(index)} />
          )}
        />
      ) : (
        <View style={styles.flex}>
          {header}
          {vm.state === 'loading' ? Array.from({ length: 6 }, (_, k) => <SkeletonRow key={k} />) : null}
          {vm.state === 'error' ? (
            <StatePanel
              icon="alert-circle-outline"
              title="Couldn't load songs"
              body="Check your connection and try again."
              action="Try again"
              onAction={() => void vm.retry()}
            />
          ) : null}
          {vm.state === 'offline' ? (
            <StatePanel
              icon="cloud-off-outline"
              title="No saved picks for this mood"
              body="Connect to the internet to get recommendations."
              action="Try again"
              onAction={() => void vm.retry()}
            />
          ) : null}
          {vm.state === 'empty' ? (
            <StatePanel
              icon="emoticon-outline"
              title="Choose a mood to get picks"
              action="Choose mood"
              onAction={() => router.push('/check-in')}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBlock: { gap: space.area, paddingBottom: space.tight },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    paddingLeft: space.margin,
    paddingRight: space.tight,
    paddingTop: space.grid,
  },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space.tight, marginTop: space.text },
  top: { gap: space.grid, paddingHorizontal: space.margin },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.grid,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: space.group,
    backgroundColor: color.containerHigh,
  },
  sectionHead: { gap: space.grid, paddingHorizontal: space.margin },
});
