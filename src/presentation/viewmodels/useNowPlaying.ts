import { PlayerService } from '@/data/player/PlayerService';
import { MOOD_CODES, type Mood } from '@/domain/types';
import { useAppSelector } from '@/store';

/** View model for SCR-07 (UC-04). */
export function useNowPlaying() {
  const p = useAppSelector((s) => s.player);
  const song = p.queue[p.index] ?? null;
  const myTags = useAppSelector((s) => (song ? s.tags.bySong[song.id] : undefined));
  const moods = MOOD_CODES.filter((m) => myTags?.[m]) as Mood[];
  return {
    song,
    source: p.source,
    isPlaying: p.isPlaying,
    isBuffering: p.isBuffering,
    position: p.positionSec,
    duration: p.durationSec || song?.durationSec || 0,
    hasNext: p.index < p.queue.length - 1,
    hasPrevious: p.index > 0,
    myMoods: moods,
    pending: (m: Mood) => !!myTags?.[m]?.pending,
    toggle: () => (p.isPlaying ? PlayerService.pause() : PlayerService.play()),
    next: () => PlayerService.next(),
    previous: () => PlayerService.previous(),
    seek: (sec: number) => PlayerService.seekTo(sec),
  };
}
