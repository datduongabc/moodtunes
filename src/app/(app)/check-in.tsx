import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { CONTEXTS, MOODS, moodInfo } from '@/domain/moods';
import { MoodTile } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { Txt } from '@/presentation/components/Txt';
import { space } from '@/presentation/theme/tokens';
import { useCheckIn } from '@/presentation/viewmodels/useCheckIn';

/** SCR-04 Mood check-in (FR-05). */
export default function CheckIn() {
  const vm = useCheckIn();
  const rows = [0, 2, 4, 6].map((i) => MOODS.slice(i, i + 2));
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pair}>
          <Txt variant="bodyLarge" muted>
            {vm.greeting}
          </Txt>
          <Txt variant="headlineSmall" accessibilityRole="header">
            How are you feeling right now?
          </Txt>
        </View>
        <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Mood">
          <Txt variant="titleSmall" muted>
            Mood
          </Txt>
          {rows.map((row) => (
            <View key={row[0].code} style={styles.row}>
              {row.map((m) => (
                <MoodTile
                  key={m.code}
                  mood={m.code}
                  selected={vm.mood === m.code}
                  onPress={() => vm.setMood(m.code)}
                  disabled={vm.busy}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.group}>
          <Txt variant="titleSmall" muted>
            What are you doing? (optional)
          </Txt>
          <View style={styles.chips}>
            {CONTEXTS.map((c) => (
              <Chip
                key={c.code}
                icon={c.icon}
                selected={vm.context === c.code}
                showSelectedOverlay
                onPress={() => vm.setContext(c.code)}
                disabled={vm.busy}
              >
                {c.label}
              </Chip>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <Button
          mode="contained"
          icon="play"
          onPress={() => void vm.play()}
          disabled={!vm.mood || vm.busy}
          loading={vm.busy}
          testID="checkin-play"
        >
          {vm.mood
            ? vm.busy
              ? `Starting ${moodInfo(vm.mood).label} mix…`
              : `Play ${moodInfo(vm.mood).label} mix`
            : 'Choose a mood'}
        </Button>
        <Button onPress={vm.skip} disabled={vm.busy}>
          Not now
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.margin, paddingTop: space.top, gap: space.area },
  pair: { gap: space.text },
  group: { gap: space.grid },
  row: { flexDirection: 'row', gap: space.group },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
  bottom: { padding: space.margin, gap: space.tight },
});
