import type { DiaryEntry, ListeningContext, Mood, Profile, Song } from '@/domain/types';

export type SongRow = {
  id: number;
  title: string;
  artist_name: string;
  album_name: string | null;
  duration_sec: number;
  audio_url: string;
  image_url: string | null;
  license_name: string;
  license_url: string;
};

export const songFromRow = (r: SongRow): Song => ({
  id: r.id,
  title: r.title,
  artistName: r.artist_name,
  albumName: r.album_name,
  durationSec: r.duration_sec,
  audioUrl: r.audio_url,
  imageUrl: r.image_url,
  licenseName: r.license_name,
  licenseUrl: r.license_url,
});

export type TagRow = {
  song_id: number;
  mood_code: string;
  context: string | null;
  note: string | null;
  created_at: string;
  songs: SongRow;
};

export const diaryFromRow = (r: TagRow): DiaryEntry => ({
  songId: r.song_id,
  mood: r.mood_code as Mood,
  context: r.context as ListeningContext | null,
  note: r.note,
  createdAt: r.created_at,
  song: songFromRow(r.songs),
});

export type ProfileRow = { id: string; display_name: string; daily_goal_min: number };
export const profileFromRow = (r: ProfileRow): Profile => ({
  id: r.id,
  displayName: r.display_name,
  dailyGoalMin: r.daily_goal_min,
});
