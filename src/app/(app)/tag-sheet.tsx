import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { MOODS } from '@/domain/moods';
import { MoodChip } from '@/presentation/components/MoodChip';
import { Txt } from '@/presentation/components/Txt';
import { color, space } from '@/presentation/theme/tokens';
import { useAppSelector } from '@/store';
import { toggleTag } from '@/store/services';

const NOTE_MAX = 140;

/** SCR-09 Tag sheet (FR-04): two taps from Now Playing (AC-04.1.1), note up to 140 characters (AC-04.1.4). */
export default function TagSheet() {
  const song = useAppSelector((s) => s.player.queue[s.player.index]);
  const tags = useAppSelector((s) => (song ? s.tags.bySong[song.id] : undefined));
  const online = useAppSelector((s) => s.network.online);
  const firstNote = tags ? (Object.values(tags).find((t) => t?.note)?.note ?? '') : '';
  const [note, setNote] = useState(firstNote);
  if (!song) return null;
  const selected = MOODS.filter((m) => tags?.[m.code]);
  const anyPending = selected.some((m) => tags?.[m.code]?.pending);

  const done = () => {
    const trimmed = note.trim() || null;
    for (const m of selected) {
      if ((tags?.[m.code]?.note ?? null) !== trimmed) void toggleTag(song.id, m.code, { note: trimmed, forceOn: true });
    }
    router.back();
  };

  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Txt variant="titleLarge" accessibilityRole="header">
          How does this song feel?
        </Txt>
        <Txt muted numberOfLines={1}>
          {song.title}, {song.artistName}
        </Txt>
      </View>
      <View style={styles.chips}>
        {MOODS.map((m) => (
          <MoodChip
            key={m.code}
            mood={m.code}
            selected={!!tags?.[m.code]}
            pending={tags?.[m.code]?.pending}
            onPress={() => void toggleTag(song.id, m.code, { note: note.trim() || null })}
          />
        ))}
      </View>
      <View style={styles.note}>
        <TextInput
          mode="outlined"
          label="Note (optional)"
          placeholder="Deadline night, third coffee"
          value={note}
          onChangeText={(t) => setNote([...t].slice(0, NOTE_MAX).join(''))}
          maxLength={NOTE_MAX}
          disabled={selected.length === 0}
          testID="tag-note"
        />
        <View style={styles.counter}>
          <Txt variant="bodySmall" muted>
            Only you can see this note
          </Txt>
          <Txt variant="bodySmall" muted accessibilityLabel={`${NOTE_MAX - [...note].length} characters left`}>
            {[...note].length}/{NOTE_MAX}
          </Txt>
        </View>
      </View>
      {!online && anyPending ? (
        <View style={styles.pending}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={color.warning} />
          <Txt variant="bodySmall" style={{ color: color.warning, flex: 1 }}>
            {"You're offline. Your tags will sync when you reconnect"}
          </Txt>
        </View>
      ) : null}
      <Button mode="contained" onPress={done} testID="tag-done">
        Done
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: color.container },
  content: { padding: space.margin, paddingBottom: space.area, gap: space.group },
  head: { gap: space.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
  note: { gap: space.text },
  counter: { flexDirection: 'row', justifyContent: 'space-between' },
  pending: { flexDirection: 'row', gap: space.tight, alignItems: 'center' },
});
