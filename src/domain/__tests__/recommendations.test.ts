import { demoteRecentlyPlayed, RECENT_PLAY_MS } from '../recommendations';
import type { Recommendation, Song } from '../types';

const song = (id: number): Song => ({
  id,
  title: `S${id}`,
  artistName: 'A',
  albumName: null,
  durationSec: 200,
  audioUrl: 'https://x/a.mp3',
  imageUrl: null,
  licenseName: 'CC BY',
  licenseUrl: 'https://creativecommons.org',
});
const recs = (ids: number[]): Recommendation[] => ids.map((id, i) => ({ song: song(id), score: 1 - i / 10 }));

describe('recently played songs (AC-06.1.3)', () => {
  const now = 10 * RECENT_PLAY_MS;
  it('moves songs played in the last two hours to the end, keeping order', () => {
    const out = demoteRecentlyPlayed(recs([1, 2, 3, 4]), { 1: now - 1000, 3: now - 5000 }, now);
    expect(out.map((r) => r.song.id)).toEqual([2, 4, 1, 3]);
  });
  it('keeps songs played more than two hours ago in place', () => {
    const out = demoteRecentlyPlayed(recs([1, 2]), { 1: now - RECENT_PLAY_MS }, now);
    expect(out.map((r) => r.song.id)).toEqual([1, 2]);
  });
});
