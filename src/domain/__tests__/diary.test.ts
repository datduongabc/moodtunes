import { groupByDay } from '../diary';
import type { DiaryEntry, Mood } from '../types';

const entry = (songId: number, mood: Mood, iso: string): DiaryEntry => ({
  songId,
  mood,
  context: null,
  note: null,
  createdAt: iso,
  song: {
    id: songId,
    title: 't',
    artistName: 'a',
    albumName: null,
    durationSec: 1,
    audioUrl: 'https://x',
    imageUrl: null,
    licenseName: 'l',
    licenseUrl: 'u',
  },
});

describe('diary grouping (AC-07.1.1, AC-07.1.2)', () => {
  const entries = [
    entry(1, 'happy', new Date(2026, 10, 9, 8).toISOString()),
    entry(2, 'sad', new Date(2026, 10, 10, 9).toISOString()),
    entry(3, 'happy', new Date(2026, 10, 10, 21).toISOString()),
  ];
  it('groups by day, most recent first', () => {
    const days = groupByDay(entries);
    expect(days.map((d) => d.day)).toEqual(['2026-11-10', '2026-11-09']);
    expect(days[0].entries.map((e) => e.songId)).toEqual([3, 2]);
  });
  it('filters by mood', () => {
    const days = groupByDay(entries, 'happy');
    expect(days.flatMap((d) => d.entries).map((e) => e.songId)).toEqual([3, 1]);
  });
});
