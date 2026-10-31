/** Mood check-in rule (AC-05.1.1, AC-05.1.5). */
export const CHECKIN_AFTER_MS = 30 * 60_000;

export function shouldShowCheckIn(args: {
  coldStart: boolean;
  backgroundSince: number | null;
  now: number;
  isPlaying: boolean;
}): boolean {
  if (args.isPlaying) return false;
  if (args.coldStart) return true;
  return args.backgroundSince !== null && args.now - args.backgroundSince >= CHECKIN_AFTER_MS;
}
