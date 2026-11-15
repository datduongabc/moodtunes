import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, SegmentedButtons } from 'react-native-paper';
import { moodInfo } from '@/domain/moods';
import { Screen } from '@/presentation/components/Screen';
import { SkeletonRow } from '@/presentation/components/SongRow';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, radius, space } from '@/presentation/theme/tokens';
import { useMoodStats, type StatsPeriod } from '@/presentation/viewmodels/useMoodStats';

/** Mood statistics (FR-14): share of each mood in my own tags this week or this month. */
export default function MoodStats() {
  const vm = useMoodStats();
  const periodText = vm.period === 'week' ? 'this week' : 'this month';
  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="Back" />
        <Appbar.Content title="Mood statistics" />
      </Appbar.Header>
      <View style={styles.periods}>
        <SegmentedButtons
          value={vm.period}
          onValueChange={(v) => vm.setPeriod(v as StatsPeriod)}
          buttons={[
            { value: 'week', label: 'This week' },
            { value: 'month', label: 'This month' },
          ]}
        />
      </View>
      {vm.state === 'success' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Txt muted>
            {vm.total} {vm.total === 1 ? 'tag' : 'tags'} {periodText}
          </Txt>
          {vm.shares.map((s) => {
            const m = moodInfo(s.mood);
            const percent = Math.round(s.share * 100);
            return (
              <View
                key={s.mood}
                style={styles.row}
                accessible
                accessibilityLabel={`${m.label}, ${percent} percent, ${s.count} ${s.count === 1 ? 'tag' : 'tags'}`}
              >
                <View style={styles.label}>
                  <MaterialCommunityIcons name={m.icon as never} size={20} color={m.color} />
                  <Txt variant="titleSmall">{m.label}</Txt>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(percent, 2)}%`, backgroundColor: m.color }]} />
                </View>
                <Txt variant="labelLarge" style={styles.percent}>
                  {percent}%
                </Txt>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      {vm.state === 'loading' ? Array.from({ length: 4 }, (_, k) => <SkeletonRow key={k} />) : null}
      {vm.state === 'empty' ? (
        <StatePanel
          icon="chart-donut"
          title={`No tags ${periodText}`}
          body="Tag the songs you listen to and your mood mix appears here."
        />
      ) : null}
      {vm.state === 'error' || vm.state === 'offline' ? (
        <StatePanel
          icon="alert-circle-outline"
          title="Couldn't load your tags"
          body="Check your connection and try again."
          action="Try again"
          onAction={vm.retry}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.background },
  periods: { paddingHorizontal: space.margin, paddingBottom: space.grid },
  content: { padding: space.margin, gap: space.group },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.grid },
  label: { flexDirection: 'row', alignItems: 'center', gap: space.tight, width: 112 },
  track: { flex: 1, height: 12, borderRadius: radius.full, backgroundColor: color.containerHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  percent: { width: 44, textAlign: 'right' },
});
