import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Dialog, List, Portal, Switch, TextInput } from 'react-native-paper';
import { minutesLabel } from '@/core/time';
import {
  useDeleteAccountMutation,
  useDiaryQuery,
  useGameStatsQuery,
  useProfileQuery,
  useUpdateProfileMutation,
} from '@/data/remote/api';
import { Screen } from '@/presentation/components/Screen';
import { Txt } from '@/presentation/components/Txt';
import { color, MINI_PLAYER_SPACE, radius, space, tint } from '@/presentation/theme/tokens';
import { useAppDispatch, useAppSelector } from '@/store';
import { signOut } from '@/store/services';
import { uiActions } from '@/store/uiSlice';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

/** SCR-16 Profile (FR-01). */
export default function Profile() {
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.session.userId)!;
  const email = useAppSelector((s) => s.session.email);
  const extended = useAppSelector((s) => s.ui.extendedAnswerTime);
  const goal = useAppSelector((s) => s.battery.goalMin);
  const { data: profile } = useProfileQuery(uid);
  const { data: stats } = useGameStatsQuery();
  const { data: diary } = useDiaryQuery();
  const [update] = useUpdateProfileMutation();
  const [deleteAccount, del] = useDeleteAccountMutation();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const name = profile?.displayName ?? '';
  const nameValid = editing !== null && editing.trim().length >= 1 && editing.trim().length <= 30;

  const saveName = () => {
    if (!nameValid || editing === null) return;
    void update({ uid, displayName: editing.trim() }); // AC-01.3.1: saved at once
    setEditing(null);
  };

  const doDelete = async () => {
    const res = await deleteAccount();
    if ('error' in res) {
      dispatch(uiActions.snack("Couldn't delete the account. Try again"));
      return;
    }
    setConfirm(null);
    await signOut(); // AC-01.3.2
  };

  return (
    <Screen>
      <Appbar.Header style={styles.bar}>
        <Appbar.Content title="Profile" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ paddingBottom: MINI_PLAYER_SPACE }}>
        <View style={styles.head}>
          <View style={styles.who}>
            <View style={styles.avatar}>
              <Txt variant="titleLarge">{initials(name)}</Txt>
            </View>
            <View style={styles.flex}>
              <Txt variant="titleMedium" numberOfLines={1}>
                {name}
              </Txt>
              <Txt muted numberOfLines={1}>
                {email}
              </Txt>
            </View>
          </View>
          <View style={styles.stats}>
            {(
              [
                ['trophy-outline', (stats?.bestScore ?? 0).toLocaleString('en-US'), 'Best score'],
                ['tag-outline', String(diary?.entries.length ?? 0), 'Mood tags'],
              ] as const
            ).map(([icon, value, label]) => (
              <View key={label} style={styles.stat}>
                <MaterialCommunityIcons name={icon} size={20} color={color.primary} />
                <Txt variant="titleLarge">{value}</Txt>
                <Txt variant="labelMedium" muted>
                  {label}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          <List.Item
            title="Daily listening goal"
            description={minutesLabel(goal)}
            left={(p) => <List.Icon {...p} icon="timer-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => router.push('/battery')}
          />
          <List.Item
            title="Extended answer time"
            description={`Game answer time: ${extended ? 40 : 20} seconds`}
            left={(p) => <List.Icon {...p} icon="gamepad-variant-outline" />}
            right={() => (
              <Switch
                value={extended}
                onValueChange={(v) => {
                  dispatch(uiActions.extendedAnswerTime(v));
                }}
                accessibilityLabel="Extended answer time"
              />
            )}
            onPress={() => dispatch(uiActions.extendedAnswerTime(!extended))}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Display name"
            description={name}
            left={(p) => <List.Icon {...p} icon="account-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => setEditing(name)}
          />
          <List.Item
            title="About MoodTunes"
            description="Version 1.0. Music from Jamendo under Creative Commons licences"
            left={(p) => <List.Icon {...p} icon="information-outline" />}
          />
          <List.Item
            title="Sign out"
            description={email ?? undefined}
            left={(p) => <List.Icon {...p} icon="logout" />}
            onPress={() => void signOut()}
            testID="sign-out"
          />
          <List.Item
            title="Delete account"
            description="Permanently delete your data"
            titleStyle={{ color: color.error }}
            left={(p) => <List.Icon {...p} icon="delete-outline" color={color.error} />}
            onPress={() => setConfirm('')}
          />
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={editing !== null} onDismiss={() => setEditing(null)}>
          <Dialog.Title>Display name</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              value={editing ?? ''}
              onChangeText={setEditing}
              maxLength={30}
              autoFocus
              onSubmitEditing={saveName}
              error={editing !== null && !nameValid}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button onPress={saveName} disabled={!nameValid}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={confirm !== null} onDismiss={() => setConfirm(null)}>
          <Dialog.Icon icon="delete-outline" color={color.error} />
          <Dialog.Title style={styles.center}>Delete account?</Dialog.Title>
          <Dialog.Content style={{ gap: space.grid }}>
            <Txt>{"Your diary, tags, votes and scores will be deleted. You can't undo this."}</Txt>
            <TextInput
              mode="outlined"
              label="Type DELETE to confirm"
              value={confirm ?? ''}
              onChangeText={setConfirm}
              autoCapitalize="characters"
              testID="delete-confirm"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(null)}>Cancel</Button>
            <Button
              textColor={color.error}
              disabled={confirm !== 'DELETE' || del.isLoading}
              loading={del.isLoading}
              onPress={() => void doDelete()}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  bar: { backgroundColor: color.background },
  head: { gap: space.group, paddingHorizontal: space.margin, paddingTop: space.tight },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.group },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tint('#00ACC1', 0.5),
  },
  stats: { flexDirection: 'row', gap: space.grid },
  stat: {
    flex: 1,
    gap: space.text,
    padding: space.group,
    borderRadius: radius.large,
    backgroundColor: color.container,
  },
});
