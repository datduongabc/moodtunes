import { localDayKey, startOfLocalDay } from '../day';

describe('localDay', () => {
  it('starts at local midnight and keys the same calendar day identically', () => {
    const noon = new Date(2026, 10, 15, 12, 30).getTime();
    const start = startOfLocalDay(noon);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(15);
    expect(localDayKey(noon)).toBe('2026-11-15');
    expect(localDayKey(new Date(2026, 10, 15, 0, 5).getTime())).toBe('2026-11-15');
    expect(localDayKey(new Date(2026, 10, 15, 23, 59).getTime())).toBe('2026-11-15');
    expect(localDayKey(new Date(2026, 10, 16, 0, 0).getTime())).toBe('2026-11-16');
  });
});
