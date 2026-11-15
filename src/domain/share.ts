import { moodInfo } from './moods';
import type { Mood, Song } from './types';

export type SongSharePayload = {
  title: string;
  message: string;
  url: string;
};

const JAMENDO_HOME = 'https://www.jamendo.com';

/**
 * The public track page, not `audioUrl`: the stream URL would make Facebook post a bare MP3 file
 * without title or artwork, while the track page renders a preview card and credits the artist
 * as the Creative Commons licence requires.
 */
const trackPageUrl = (song: Song) =>
  song.jamendoId ? `${JAMENDO_HOME}/track/${encodeURIComponent(song.jamendoId)}` : JAMENDO_HOME;

/** Builds the text and link passed to the native Share Sheet (Facebook, etc.). */
export function buildSongSharePayload(song: Song, moods: Mood[]): SongSharePayload {
  const url = trackPageUrl(song);
  const labels = moods.map((m) => moodInfo(m).label);
  const moodPart = labels.length > 0 ? ` (${labels.join(', ')})` : '';
  const message = `Listening to "${song.title}" by ${song.artistName}${moodPart} on MoodTunes\n${url}`;
  return {
    title: `${song.title} - ${song.artistName}`,
    message,
    url,
  };
}
