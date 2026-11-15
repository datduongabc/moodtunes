import { buildSongSharePayload } from '../share';
import type { Song } from '../types';

const song: Song = {
  id: 42,
  jamendoId: '1886257',
  title: 'Night Drive',
  artistName: 'Luna',
  albumName: null,
  durationSec: 185,
  audioUrl: 'https://mp3d.jamendo.com/track/42.mp3',
  imageUrl: null,
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

describe('buildSongSharePayload', () => {
  it('includes title, artist, moods and url when moods are provided', () => {
    const payload = buildSongSharePayload(song, ['focused', 'relaxed']);
    expect(payload.title).toBe('Night Drive - Luna');
    // a track page renders a preview card in Facebook, unlike the raw MP3 stream
    expect(payload.url).toBe('https://www.jamendo.com/track/1886257');
    expect(payload.message).toContain('"Night Drive" by Luna');
    expect(payload.message).toContain('(Focused, Relaxed)');
    expect(payload.message).toContain('https://www.jamendo.com/track/1886257');
  });

  it('omits mood parenthetical when song has no mood tags', () => {
    const payload = buildSongSharePayload(song, []);
    expect(payload.message).toBe(
      `Listening to "Night Drive" by Luna on MoodTunes\nhttps://www.jamendo.com/track/1886257`,
    );
  });

  it('falls back to the Jamendo home page when a cached song has no Jamendo id', () => {
    const payload = buildSongSharePayload({ ...song, jamendoId: null }, []);
    expect(payload.url).toBe('https://www.jamendo.com');
    expect(payload.message).not.toContain('.mp3');
  });
});
