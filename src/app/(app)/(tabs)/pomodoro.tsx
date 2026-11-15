import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Chip } from 'react-native-paper';
import { MOODS, moodInfo } from '@/domain/moods';
import {
  BREAK_MIN_MAX,
  BREAK_MIN_MIN,
  DURATION_STEP,
  FOCUS_MIN_MAX,
  FOCUS_MIN_MIN,
  POMODORO_PRESETS,
} from '@/domain/pomodoro';
import { MoodChip } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, radius, space, tint } from '@/presentation/theme/tokens';
import { usePomodoro } from '@/presentation/viewmodels/usePomodoro';

/** Pomodoro Focus + Music tab. */
export default function Pomodoro() {
  const vm = usePomodoro();
  const accent = moodInfo(vm.mood).base;
  const phaseLabel = vm.phase === 'focus' ? 'Focus time' : vm.phase === 'break' ? 'Break time' : 'Ready to focus';

  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.Content title="Focus Pomodoro" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.timerCard, { backgroundColor: tint(accent, 0.2) }]}>
          <View style={styles.phaseRow}>
            <MaterialCommunityIcons
              name={vm.phase === 'break' ? 'coffee-outline' : 'timer-outline'}
              size={20}
              color={color.primary}
            />
            <Txt variant="titleSmall" style={{ color: color.primary }}>
              {phaseLabel}
            </Txt>
          </View>
          <Txt variant="displaySmall" style={styles.clock} accessibilityLabel={`Remaining ${vm.timeText}`}>
            {vm.timeText}
          </Txt>
          <Txt variant="bodySmall" muted>
            {vm.phase === 'focus'
              ? `Playing ${moodInfo(vm.mood).label} mix · pauses automatically on break`
              : vm.phase === 'break'
                ? 'Music paused while you rest'
                : `${vm.focusMin} min focus · ${vm.breakMin} min break`}
          </Txt>

          <View style={styles.controls}>
            {vm.phase === 'idle' ? (
              <Button
                mode="contained"
                icon="play"
                onPress={() => void vm.startFocus()}
                loading={vm.startingMusic}
                testID="pomodoro-start"
              >
                Start Focus
              </Button>
            ) : (
              <>
                <Button
                  mode="contained"
                  icon={vm.isPaused ? 'play' : 'pause'}
                  onPress={vm.isPaused ? vm.resume : vm.pause}
                  testID="pomodoro-toggle"
                >
                  {vm.isPaused ? 'Resume' : 'Pause'}
                </Button>
                {vm.phase === 'focus' ? (
                  <Button mode="contained-tonal" icon="skip-next" onPress={vm.skipToBreak}>
                    Break
                  </Button>
                ) : null}
                <Button mode="outlined" onPress={vm.reset} testID="pomodoro-reset">
                  Reset
                </Button>
              </>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Txt variant="titleLarge">{vm.todayFocusMinutes}m</Txt>
            <Txt variant="labelMedium" muted>
              Focused today
            </Txt>
          </View>
          <View style={styles.statBox}>
            <Txt variant="titleLarge">{vm.totalSessions}</Txt>
            <Txt variant="labelMedium" muted>
              Sessions completed
            </Txt>
          </View>
        </View>

        {vm.phase === 'idle' ? (
          <View style={styles.section}>
            <Txt variant="titleSmall" accessibilityRole="header">
              Timer preset
            </Txt>
            <View style={styles.chips}>
              {POMODORO_PRESETS.map((p) => (
                <Chip
                  key={p.id}
                  selected={vm.presetId === p.id}
                  showSelectedOverlay
                  onPress={() => vm.selectPreset(p.id, p.focusMin, p.breakMin)}
                >
                  {p.label} min
                </Chip>
              ))}
              <Chip
                selected={vm.presetId === 'custom'}
                showSelectedOverlay
                onPress={() => vm.setCustomFocus(vm.focusMin)}
              >
                Custom
              </Chip>
            </View>

            <View style={styles.card}>
              <View style={styles.sliderHead}>
                <Txt variant="bodyMedium">Focus duration</Txt>
                <Txt variant="titleSmall" style={{ color: color.primary }}>
                  {vm.focusMin} min
                </Txt>
              </View>
              <Slider
                minimumValue={FOCUS_MIN_MIN}
                maximumValue={FOCUS_MIN_MAX}
                step={DURATION_STEP}
                value={vm.focusMin}
                onSlidingComplete={vm.setCustomFocus}
                minimumTrackTintColor={color.primary}
                maximumTrackTintColor={color.outlineVariant}
                thumbTintColor={color.primary}
                accessibilityLabel="Focus duration in minutes"
              />
              <View style={styles.sliderHead}>
                <Txt variant="bodyMedium">Break duration</Txt>
                <Txt variant="titleSmall" style={{ color: color.primary }}>
                  {vm.breakMin} min
                </Txt>
              </View>
              <Slider
                minimumValue={BREAK_MIN_MIN}
                maximumValue={BREAK_MIN_MAX}
                step={1}
                value={vm.breakMin}
                onSlidingComplete={vm.setCustomBreak}
                minimumTrackTintColor={color.primary}
                maximumTrackTintColor={color.outlineVariant}
                thumbTintColor={color.primary}
                accessibilityLabel="Break duration in minutes"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Txt variant="titleSmall" accessibilityRole="header">
            Study music mood
          </Txt>
          <View style={styles.chips}>
            {MOODS.map((m) => (
              <MoodChip key={m.code} mood={m.code} selected={vm.mood === m.code} onPress={() => vm.setMood(m.code)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.background },
  content: { padding: space.margin, paddingBottom: MINI_PLAYER_SPACE, gap: space.group },
  timerCard: {
    padding: space.area,
    borderRadius: radius.large,
    alignItems: 'center',
    gap: space.grid,
  },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  clock: { fontVariant: ['tabular-nums'], letterSpacing: 1 },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.tight,
    marginTop: space.tight,
  },
  statsRow: { flexDirection: 'row', gap: space.grid },
  statBox: {
    flex: 1,
    padding: space.group,
    borderRadius: radius.large,
    backgroundColor: color.container,
    gap: space.text,
  },
  section: { gap: space.tight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
  card: {
    padding: space.group,
    borderRadius: radius.large,
    backgroundColor: color.container,
    gap: space.text,
    marginTop: space.text,
  },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
