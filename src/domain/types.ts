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
  /** Null for songs cached before the field existed. */
  jamendoId: string | null;
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

export type PomodoroPhase = 'idle' | 'focus' | 'break';
export type PomodoroStats = { totalSessions: number; totalFocusMinutes: number; todayFocusMinutes: number };
export type PomodoroSessionInput = {
  /** Idempotency key generated on the device. */
  id: string;
  focusMin: number;
  breakMin: number;
  mood: Mood | null;
  /** ISO time the focus period ended; a session sent later still counts on the right day. */
  completedAt: string;
  /** Start of the listener's local day, so the server counts "today" in their time zone. */
  todayStart: string;
};

export type Profile = { id: string; displayName: string; dailyGoalMin: number };

/** The five view states every screen handles (A01 section 5.4). */
export type ViewState = 'loading' | 'empty' | 'error' | 'offline' | 'success';
