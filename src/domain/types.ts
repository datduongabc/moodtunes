export const MOOD_CODES = [
  'happy',
  'sad',
  'motivated',
  'relaxed',
  'focused',
  'romantic',
  'nostalgic',
  'angry',
] as const;
export type Mood = (typeof MOOD_CODES)[number];

export const CONTEXT_CODES = ['study', 'work', 'commute', 'workout'] as const;
export type ListeningContext = (typeof CONTEXT_CODES)[number];

export type Song = {
  id: number;
  title: string;
  artistName: string;
  albumName: string | null;
  durationSec: number;
  audioUrl: string;
  imageUrl: string | null;
  licenseName: string;
  licenseUrl: string;
};

export type Tag = {
  songId: number;
  mood: Mood;
  context: ListeningContext | null;
  note: string | null;
  createdAt: string;
};

export type DiaryEntry = Tag & { song: Song; pending?: boolean };

export type Recommendation = { song: Song; score: number };
export type Recommendations = {
  mood: Mood;
  context: ListeningContext | null;
  isSample: boolean;
  items: Recommendation[];
};

export type ChartEntry = { rank: number; votes: number; previousRank: number | null; myVote: boolean; song: Song };
export type Chart = { mood: Mood; period: 'week'; computedAt: string | null; isSample: boolean; entries: ChartEntry[] };

export type GameQuestion = { index: number; song: Song; clipStartSec: number; options: Mood[] };
export type GameRound = { roundId: string; questions: GameQuestion[] };
export type AnswerResult = {
  correct: boolean;
  correctMood: Mood;
  points: number;
  streak: number;
  totalScore: number;
  correctCount: number;
  finished: boolean;
  distribution: { mood: Mood; percent: number }[];
};
export type GameStats = { bestScore: number; roundsPlayed: number };

export type Profile = { id: string; displayName: string; dailyGoalMin: number };

/** The five view states every screen handles (A01 section 5.4). */
export type ViewState = 'loading' | 'empty' | 'error' | 'offline' | 'success';
