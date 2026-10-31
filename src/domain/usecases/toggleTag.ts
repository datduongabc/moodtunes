import type { OutboxChange } from '../outbox';
import type { ListeningContext, Mood } from '../types';

export type ExistingTag = { note: string | null; context: ListeningContext | null; createdAt: string };

/** Ports implemented by the data layer and the store (dependency rule, A01 section 5.4). */
export type ToggleTagPorts = {
  getTag: (songId: number, mood: Mood) => ExistingTag | undefined;
  defaultContext: () => ListeningContext | null;
  showOn: (songId: number, mood: Mood, tag: ExistingTag) => void;
  showOff: (songId: number, mood: Mood) => void;
  enqueue: (change: Omit<OutboxChange, 'attempts'>) => Promise<void>;
  sync: () => void;
  now: () => number;
};

/**
 * ToggleTag use case (CMP-APP-04, SD-02): the change is shown at once, written to the outbox
 * (replacing any earlier change for the same song and mood) and handed to the sync engine.
 */
export function makeToggleTag(p: ToggleTagPorts) {
  return async (
    songId: number,
    mood: Mood,
    opts: { note?: string | null; context?: ListeningContext | null; forceOn?: boolean } = {},
  ): Promise<boolean> => {
    const existing = p.getTag(songId, mood);
    const turnOn = opts.forceOn ?? !existing;
    const now = p.now();
    const note = opts.note === undefined ? (existing?.note ?? null) : opts.note;
    const context = opts.context === undefined ? (existing?.context ?? p.defaultContext()) : opts.context;
    if (turnOn)
      p.showOn(songId, mood, { note, context, createdAt: existing?.createdAt ?? new Date(now).toISOString() });
    else p.showOff(songId, mood);
    await p.enqueue({
      songId,
      mood,
      op: turnOn ? 'put' : 'delete',
      note: turnOn ? note : null,
      context: turnOn ? context : null,
      createdAt: now,
    });
    p.sync();
    return turnOn;
  };
}
