import type { ListeningContext, Mood } from './types';

export type MoodInfo = { code: Mood; label: string; icon: string; color: string; base: string };

/** Accent colours meet 4.5:1 on the dark surface; base colours are used for gradients (A01 table 7.2). */
export const MOODS: readonly MoodInfo[] = [
  { code: 'happy', label: 'Happy', icon: 'weather-sunny', color: '#FFEE58', base: '#F9A825' },
  { code: 'sad', label: 'Sad', icon: 'weather-rainy', color: '#64B5F6', base: '#1E88E5' },
  { code: 'motivated', label: 'Motivated', icon: 'fire', color: '#FFB74D', base: '#FB8C00' },
  { code: 'relaxed', label: 'Relaxed', icon: 'leaf', color: '#81C784', base: '#43A047' },
  { code: 'focused', label: 'Focused', icon: 'target', color: '#4DD0E1', base: '#00ACC1' },
  { code: 'romantic', label: 'Romantic', icon: 'heart', color: '#F48FB1', base: '#D81B60' },
  { code: 'nostalgic', label: 'Nostalgic', icon: 'history', color: '#BCAAA4', base: '#8D6E63' },
  { code: 'angry', label: 'Angry', icon: 'lightning-bolt', color: '#EF5350', base: '#E53935' },
];

export const moodInfo = (code: Mood): MoodInfo => MOODS.find((m) => m.code === code) ?? MOODS[0];

export const CONTEXTS: readonly { code: ListeningContext; label: string; icon: string }[] = [
  { code: 'study', label: 'Studying', icon: 'book-open-variant' },
  { code: 'work', label: 'Working', icon: 'briefcase-outline' },
  { code: 'commute', label: 'Commuting', icon: 'bus' },
  { code: 'workout', label: 'Working out', icon: 'dumbbell' },
];
