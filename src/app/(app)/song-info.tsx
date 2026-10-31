import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, View } from 'react-native';
import { moodInfo } from '@/domain/moods';
import { useSongMoodsQuery } from '@/data/remote/api';
import { Txt } from '@/presentation/components/Txt';
import { color, space } from '@/presentation/theme/tokens';
import { useAppSelector } from '@/store';

/** Song info: Creative Commons attribution — title, author, source, licence (AC-03.1.4, NFR-LIC-01). */
export default function SongInfo() {
  const song = useAppSelector((s) => s.player.queue[s.player.index]);
  const { data: moods } = useSongMoodsQuery(song?.id ?? 0, { skip: !song });
  if (!song) return null;
  const rows: [string, string, string | null][] = [
    ['Title', song.title, null],
    ['Artist', song.artistName, null],
    ['Source', 'Jamendo', 'https://www.jamendo.com'],
    ['Licence', song.licenseName, song.licenseUrl],
  ];
  if (moods && moods.length > 0) {
    rows.push(['Listeners tag it', moods.map((m) => `${moodInfo(m.mood).label} ${m.percent}%`).join(', '), null]);
  }
  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
      <Txt variant="titleLarge" accessibilityRole="header">
        Song info
      </Txt>
      {rows.map(([k, v, link]) => (
        <View key={k} style={styles.row}>
          <Txt muted style={styles.key}>
            {k}
          </Txt>
          <Txt
            style={[styles.value, link ? styles.link : null]}
            onPress={link ? () => void WebBrowser.openBrowserAsync(link) : undefined}
            accessibilityRole={link ? 'link' : undefined}
          >
            {v}
          </Txt>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: color.container },
  content: { padding: space.margin, paddingBottom: space.area, gap: space.group },
  row: { flexDirection: 'row', gap: space.group },
  key: { width: 120 },
  value: { flex: 1 },
  link: { color: color.primary, textDecorationLine: 'underline' },
});
