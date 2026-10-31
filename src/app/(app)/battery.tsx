import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar } from 'react-native-paper';
import { minutesLabel } from '@/core/time';
import { GOAL_MAX, GOAL_MIN, GOAL_STEP } from '@/domain/battery';
import { useUpdateProfileMutation } from '@/data/remote/api';
import { levelColor } from '@/presentation/components/BatteryCard';
import { Screen } from '@/presentation/components/Screen';
import { Txt } from '@/presentation/components/Txt';
import { color, radius, space } from '@/presentation/theme/tokens';
import { useBattery } from '@/presentation/viewmodels/useBattery';
import { useAppDispatch, useAppSelector } from '@/store';
import { batteryActions } from '@/store/batterySlice';

/** SCR-12 Listening battery (FR-08). */
export default function Battery() {
  const b = useBattery();
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.session.userId);
  const [update] = useUpdateProfileMutation();
  const [draft, setDraft] = useState<number | null>(null);
  const goal = draft ?? b.goalMin;

  const save = (min: number) => {
    setDraft(null);
    dispatch(batteryActions.goalChanged(min));
    if (uid) void update({ uid, dailyGoalMin: min }); // AC-08.1.2, saved without a Save button
  };

  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.BackAction onPress={() => router.back()} accessibilityLabel="Back" />
        <Appbar.Content title="Listening battery" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={styles.battery}
          accessible
          accessibilityLabel={`${b.percent} percent of today's listening time left`}
        >
          <View style={styles.cap} />
          <View style={styles.body}>
            <View style={[styles.level, { height: `${b.percent}%`, backgroundColor: levelColor[b.level] }]} />
          </View>
        </View>
        <View style={styles.text}>
          <Txt variant="headlineMedium" style={styles.center}>
            {b.level === 'empty' ? 'Daily goal reached' : `${minutesLabel(b.leftMin)} left`}
          </Txt>
          <Txt variant="bodyLarge" muted style={styles.center}>
            {`You've listened for ${minutesLabel(b.listenedMin)} of your ${minutesLabel(b.goalMin)} goal today`}
          </Txt>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
            <Txt variant="titleMedium">Daily goal</Txt>
            <Txt variant="titleMedium" style={{ color: color.primary }}>
              {minutesLabel(goal)}
            </Txt>
          </View>
          <Slider
            minimumValue={GOAL_MIN}
            maximumValue={GOAL_MAX}
            step={GOAL_STEP}
            value={b.goalMin}
            onValueChange={setDraft}
            onSlidingComplete={save}
            minimumTrackTintColor={color.primary}
            maximumTrackTintColor={color.outlineVariant}
            thumbTintColor={color.primary}
            accessibilityLabel="Daily goal"
            testID="goal-slider"
          />
          <View style={styles.row}>
            <Txt variant="labelMedium" muted>
              30 min
            </Txt>
            <Txt variant="labelMedium" muted>
              8 hr
            </Txt>
          </View>
          <Txt variant="bodySmall" muted>
            Resets at midnight. You get a reminder at 20% and 0%, and the music keeps playing.
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.background },
  content: { padding: space.margin, gap: space.area, alignItems: 'center' },
  battery: { alignItems: 'center' },
  cap: {
    width: 48,
    height: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: color.onSurfaceVariant,
  },
  body: {
    width: 140,
    height: 220,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: color.onSurfaceVariant,
    padding: 8,
    justifyContent: 'flex-end',
  },
  level: { width: '100%', borderRadius: 18, minHeight: 0 },
  text: { gap: space.text, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  card: {
    alignSelf: 'stretch',
    gap: space.grid,
    padding: space.group,
    borderRadius: radius.large,
    backgroundColor: color.container,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
