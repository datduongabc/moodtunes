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

export const isFocusMin = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 5 && v <= 120;
export const isBreakMin = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 30;

/**
 * Start of the caller's local day as an ISO instant. Accepted only within the last 38 hours
 * (time zones span UTC-12 to UTC+14), so a wrong clock cannot inflate "today".
 */
export function parseTodayStart(v: unknown, nowMs: number): Date | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  if (Number.isNaN(t) || t > nowMs || nowMs - t > 38 * 3_600_000) return null;
  return new Date(t);
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);

/**
 * End time of a focus session sent by the device. Sessions completed offline arrive late, so up to
 * 30 days are accepted; five minutes of clock skew are tolerated in the other direction.
 */
export function parseCompletedAt(v: unknown, nowMs: number): Date | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  if (Number.isNaN(t) || t > nowMs + 5 * 60_000 || nowMs - t > 30 * 24 * 3_600_000) return null;
  return new Date(t);
}
