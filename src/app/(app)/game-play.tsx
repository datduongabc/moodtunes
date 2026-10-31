import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Dialog, Portal, ProgressBar } from 'react-native-paper';
import { moodInfo } from '@/domain/moods';
import type { Mood } from '@/domain/types';
import { MoodIcon } from '@/presentation/components/MoodChip';
import { Screen } from '@/presentation/components/Screen';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, radius, space, tint } from '@/presentation/theme/tokens';
import { useGame } from '@/presentation/viewmodels/useGame';

/** SCR-14 Game question and answer feedback, SCR-15 result. */
export default function GamePlay() {
  const vm = useGame();
  const quit = () => router.back();

  if (vm.phase === 'starting') {
    return (
      <Screen edges={['top', 'bottom']}>
        <ActivityIndicator style={styles.flex} />
      </Screen>
    );
  }
  if (vm.phase === 'notEnough' || vm.phase === 'error') {
    return (
      <Screen edges={['top', 'bottom']}>
        <Appbar.Header style={styles.bar}>
          <Appbar.BackAction onPress={quit} />
          <Appbar.Content title="Mood Guess" />
        </Appbar.Header>
        {vm.phase === 'notEnough' ? (
          <StatePanel
            icon="gamepad-variant-outline"
            title="Not enough tagged songs yet"
            body="The game needs 10 songs with at least 5 tags each. Tag songs or vote in Charts, then try again."
            action="Go to Charts"
            onAction={() => router.replace('/charts')}
          />
        ) : (
          <StatePanel
            icon="alert-circle-outline"
            title="Couldn't start the game"
            body="Check your connection and try again."
            action="Try again"
            onAction={() => void vm.restart()}
          />
        )}
      </Screen>
    );
  }
  if (vm.phase === 'result' && vm.result) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.resultBox}>
          <MaterialCommunityIcons name="trophy" size={64} color={color.warning} />
          <Txt variant="headlineMedium">Game complete</Txt>
          <Txt variant="displaySmall">{vm.result.totalScore.toLocaleString('en-US')} points</Txt>
          <Txt variant="bodyLarge" muted>
            {vm.result.correctCount} of {vm.total} correct
          </Txt>
          {vm.isNewBest ? (
            <View style={styles.newBest}>
              <Txt variant="labelLarge" style={{ color: color.onPrimaryContainer }}>
                New personal best
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Button mode="contained" onPress={() => void vm.restart()} testID="play-again">
            Play again
          </Button>
          <Button onPress={quit}>Back to lobby</Button>
        </View>
      </Screen>
    );
  }

  const q = vm.question;
  if (!q) return null;
  const feedback = vm.phase === 'feedback' && vm.result;
  const optionState = (m: Mood) => {
    if (!feedback || !vm.result) return 'default';
    if (m === vm.result.correctMood) return 'correct';
    if (m === vm.chosen) return 'wrong';
    return 'disabled';
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Button onPress={quit} icon="close">
          Quit
        </Button>
        <Txt variant="titleSmall">
          Question {vm.index + 1} of {vm.total}
        </Txt>
        <Txt variant="labelLarge" style={styles.score}>
          {vm.score}
        </Txt>
      </View>
      <ProgressBar
        progress={(vm.index + (feedback ? 1 : 0)) / vm.total}
        color={color.primary}
        style={styles.progress}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {feedback && vm.result ? (
          <View style={styles.result} accessibilityLiveRegion="polite">
            <MaterialCommunityIcons
              name={vm.result.correct ? 'check-circle' : 'close-circle'}
              size={40}
              color={vm.result.correct ? color.success : color.error}
            />
            <Txt variant="titleLarge">{vm.result.correct ? 'Correct' : vm.chosen ? 'Not quite' : "Time's up"}</Txt>
            <Txt variant="titleMedium" style={{ color: color.primary }}>
              +{vm.result.points} points
            </Txt>
            <Txt muted numberOfLines={1}>
              {q.song.title}, {q.song.artistName}
            </Txt>
            <View style={styles.dist}>
              {vm.result.distribution.map((d) => (
                <View key={d.mood} style={styles.distRow}>
                  <MoodIcon mood={d.mood} size={18} />
                  <Txt variant="labelMedium" style={styles.distLabel}>
                    {moodInfo(d.mood).label}
                  </Txt>
                  <View style={styles.distTrack}>
                    <View
                      style={[styles.distFill, { width: `${d.percent}%`, backgroundColor: moodInfo(d.mood).color }]}
                    />
                  </View>
                  <Txt variant="labelMedium" style={styles.pct}>
                    {d.percent}%
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.prompt}>
            <View style={styles.timer} accessibilityLabel={`${vm.left} seconds left`}>
              <Txt variant="titleLarge">{vm.left} s</Txt>
            </View>
            <Txt variant="titleLarge" style={styles.center}>
              Which mood fits this song?
            </Txt>
            <Txt variant="bodySmall" muted>
              Answer within {vm.limit} seconds
            </Txt>
            {vm.streak > 1 ? (
              <Txt variant="labelMedium" style={{ color: color.warning }}>
                Streak {vm.streak}
              </Txt>
            ) : null}
          </View>
        )}
        <View style={styles.grid}>
          {q.options.map((m) => {
            const st = optionState(m);
            const info = moodInfo(m);
            return (
              <Pressable
                key={m}
                onPress={() => void vm.answer(m)}
                disabled={vm.phase !== 'question'}
                accessibilityRole="button"
                accessibilityLabel={`${info.label}${st === 'correct' ? ', correct answer' : st === 'wrong' ? ', your answer, wrong' : ''}`}
                style={[
                  styles.option,
                  st === 'correct' && { borderColor: color.success, backgroundColor: tint(color.success) },
                  st === 'wrong' && { borderColor: color.error, backgroundColor: tint(color.error) },
                  st === 'disabled' && { opacity: 0.5 },
                ]}
                testID={`option-${m}`}
              >
                <MoodIcon mood={m} size={22} />
                <Txt variant="titleSmall" numberOfLines={1} style={styles.flex}>
                  {info.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {feedback && vm.result ? (
        <View style={styles.bottom}>
          <Button
            mode="contained-tonal"
            icon={vm.tagged ? 'check' : 'tag-outline'}
            disabled={vm.tagged}
            onPress={() => vm.tagAs(vm.chosen ?? vm.result!.correctMood)}
          >
            {vm.tagged ? 'Tagged' : `Tag as ${moodInfo(vm.chosen ?? vm.result.correctMood).label}`}
          </Button>
          <Button mode="contained" onPress={vm.next} testID="next-question">
            {vm.result.finished ? 'See result' : 'Next'}
          </Button>
        </View>
      ) : null}
      <Portal>
        <Dialog visible={vm.phase === 'lost'} dismissable={false}>
          <Dialog.Title>Connection lost</Dialog.Title>
          <Dialog.Content>
            <Txt>The game is paused. Your answers so far are saved on the server.</Txt>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={quit}>Quit game</Button>
            <Button onPress={() => void vm.retryLost()}>Try again</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { backgroundColor: color.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: space.margin },
  score: { color: color.primary },
  progress: { marginHorizontal: space.margin, height: 4, borderRadius: 2 },
  content: { padding: space.margin, gap: space.area },
  prompt: { alignItems: 'center', gap: space.tight, paddingTop: space.area },
  timer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.grid,
  },
  center: { textAlign: 'center' },
  result: { alignItems: 'center', gap: space.tight },
  dist: { alignSelf: 'stretch', gap: space.tight, marginTop: space.tight },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  distLabel: { width: 80 },
  distTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.outlineVariant },
  distFill: { height: 8, borderRadius: 4 },
  pct: { width: 40, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.grid },
  option: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    minHeight: 64,
    paddingHorizontal: space.grid,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.container,
  },
  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.tight, padding: space.margin },
  newBest: {
    backgroundColor: color.primaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: space.grid,
    paddingVertical: space.text,
  },
  bottom: { padding: space.margin, gap: space.tight },
});
