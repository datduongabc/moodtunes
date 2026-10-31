import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button } from 'react-native-paper';
import { answerSeconds } from '@/domain/game';
import { useGameStatsQuery } from '@/data/remote/api';
import { MoodArt } from '@/presentation/components/MoodArt';
import { Screen } from '@/presentation/components/Screen';
import { StatePanel } from '@/presentation/components/StatePanel';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, radius, space, tint } from '@/presentation/theme/tokens';
import { useAppSelector } from '@/store';

/** SCR-13 Game lobby (FR-11). */
export default function GameLobby() {
  const online = useAppSelector((s) => s.network.online);
  const extended = useAppSelector((s) => s.ui.extendedAnswerTime);
  const stats = useGameStatsQuery(undefined, { skip: !online });

  if (!online) {
    return (
      <Screen>
        <Appbar.Header style={styles.bar}>
          <Appbar.Content title="Mood Guess" />
        </Appbar.Header>
        <StatePanel
          icon="wifi-off"
          title="You're offline"
          body="Answers are checked online, so the game needs a connection."
          action="Try again"
          onAction={() => void stats.refetch()}
          testID="game-offline"
        />
      </Screen>
    );
  }

  const rules: [string, string][] = [
    ['timer-outline', `15-second clip, ${answerSeconds(extended)} seconds to answer`],
    ['emoticon-outline', 'Choose from 4 moods'],
    ['star-outline', '100 points per correct answer, +20 for each one in a row'],
  ];
  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.Content title="Mood Guess" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <MaterialCommunityIcons name="gamepad-variant" size={40} color={color.onSurface} />
          <Txt variant="headlineSmall">Guess the mood</Txt>
          <Txt>Hear 10 short clips and pick the mood most listeners chose for each song.</Txt>
        </View>
        <View style={styles.rules}>
          {rules.map(([icon, text]) => (
            <View key={text} style={styles.rule}>
              <MaterialCommunityIcons name={icon as never} size={24} color={color.primary} />
              <Txt style={styles.flex}>{text}</Txt>
            </View>
          ))}
        </View>
        <View style={styles.best}>
          <MoodArt mood="happy" icon="trophy" size={48} />
          <View style={styles.flex}>
            <Txt variant="labelMedium" muted>
              Personal best
            </Txt>
            <Txt variant="titleLarge">{(stats.data?.bestScore ?? 0).toLocaleString('en-US')} points</Txt>
          </View>
          <Txt variant="labelMedium" muted>
            {stats.data?.roundsPlayed ?? 0} games
          </Txt>
        </View>
        <Button mode="contained" icon="play" onPress={() => router.push('/game-play')} testID="start-game">
          Start game
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { backgroundColor: color.background },
  content: { padding: space.margin, gap: space.area, paddingBottom: MINI_PLAYER_SPACE + space.margin },
  hero: { padding: space.area, borderRadius: 24, gap: space.tight, backgroundColor: tint('#00ACC1', 0.35) },
  rules: { gap: space.grid },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.grid },
  best: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.group,
    padding: space.group,
    borderRadius: radius.large,
    backgroundColor: color.container,
  },
});
