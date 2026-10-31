export const MOODS = ['happy', 'sad', 'motivated', 'relaxed', 'focused', 'romantic', 'nostalgic', 'angry'] as const;
export const CONTEXTS = ['study', 'work', 'commute', 'workout'] as const;
export type Mood = (typeof MOODS)[number];
export type Context = (typeof CONTEXTS)[number];

export const isMood = (v: unknown): v is Mood => typeof v === 'string' && (MOODS as readonly string[]).includes(v);
export const isContext = (v: unknown): v is Context =>
  typeof v === 'string' && (CONTEXTS as readonly string[]).includes(v);

export function parseId(v: string): number | null {
  return /^[1-9][0-9]{0,15}$/.test(v) ? Number(v) : null;
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Points for a correct answer with streak k (AC-11.1.3). Mirrors answer_question() in SQL. */
export const gamePoints = (k: number) => (k > 0 ? 100 + 20 * (k - 1) : 0);
