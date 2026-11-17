/** The listener's local calendar day. "Today" is never the UTC day: in Vietnam that is 7 hours off. */

/** Local midnight of the day containing `ms`. */
export function startOfLocalDay(ms: number): Date {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" of the local calendar day containing `ms`. */
export function localDayKey(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
