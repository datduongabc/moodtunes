const pad = (n: number) => String(n).padStart(2, '0');

/** "hh:mm" in local time, used by "Updated hh:mm" and offline banners. */
export const hhmm = (iso: string | number | null): string => {
  if (iso === null) return '--:--';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Next chart recomputation, every 15 minutes on the server clock (AC-09.2.2). */
export const nextQuarterHour = (now: number): number => {
  const q = 15 * 60_000;
  return Math.floor(now / q) * q + q;
};

export const duration = (sec: number): string => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;

export const minutesLabel = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
};
