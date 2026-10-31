import { useSyncExternalStore } from 'react';

/** A shared clock that ticks every 30 s while a component uses it (no timer otherwise, NFR-BAT-01). */
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const tickClock = () => {
  now = Date.now();
  listeners.forEach((l) => l());
};

export function useClock(): number {
  return useSyncExternalStore(subscribe, () => now);
}
