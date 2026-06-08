import { getMonthDays, getEventsForDay, HOURS, formatDate } from '@/lib/date-utils';

describe('date-utils', () => {
  describe('getMonthDays', () => {
    it('returns days covering the full month grid (Mon-Sun)', () => {
      // May 2026 starts on a Friday
      const days = getMonthDays(new Date(2026, 4, 15));
      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length).toBeLessThanOrEqual(42);

      // First day should be Monday
      expect(days[0].getDay()).toBe(1); // Monday

      // Grid should include May 1
      const hasMay1 = days.some(d => d.getDate() === 1 && d.getMonth() === 4);
      expect(hasMay1).toBe(true);

      // Grid should include May 31
      const hasMay31 = days.some(d => d.getDate() === 31 && d.getMonth() === 4);
      expect(hasMay31).toBe(true);
    });

    it('includes overflow days from adjacent months', () => {
      // January 2026 starts on Thursday, so grid shows late Dec
      const days = getMonthDays(new Date(2026, 0, 15));
      const hasDec29 = days.some(d => d.getMonth() === 11 && d.getDate() === 29);
      expect(hasDec29).toBe(true);
    });

    it('is idempotent for same input', () => {
      const a = getMonthDays(new Date(2026, 6, 1));
      const b = getMonthDays(new Date(2026, 6, 1));
      expect(a).toEqual(b);
    });
  });

  describe('getEventsForDay', () => {
    it('returns events matching the given day', () => {
      const events = [
        { id: '1', tipo: 'cita' as const, titulo: 'Event 1', fecha: '2026-05-15', estado: 'pendiente' as const },
        { id: '2', tipo: 'cita' as const, titulo: 'Event 2', fecha: '2026-05-16', estado: 'pendiente' as const },
        { id: '3', tipo: 'cita' as const, titulo: 'Event 3', fecha: '2026-05-15', estado: 'pendiente' as const },
      ];

      const day = new Date(2026, 4, 15); // May 15, 2026
      const result = getEventsForDay(events, day);

      expect(result).toHaveLength(2);
      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('returns empty array when no events match', () => {
      const events = [
        { id: '1', tipo: 'cita' as const, titulo: 'Event', fecha: '2026-06-01', estado: 'pendiente' as const },
      ];
      const result = getEventsForDay(events, new Date(2026, 4, 15));
      expect(result).toEqual([]);
    });

    it('handles empty events array', () => {
      const result = getEventsForDay([], new Date());
      expect(result).toEqual([]);
    });

  });

  describe('HOURS', () => {
    it('spans 8 AM to 9 PM', () => {
      expect(HOURS).toHaveLength(14);
      expect(HOURS[0]).toBe(8);
      expect(HOURS[HOURS.length - 1]).toBe(21);
    });
  });

  describe('formatDate', () => {
    it('formats a date with default format', () => {
      // We can't test exact string due to locale, just verify it returns a string
      const result = formatDate(new Date(2026, 4, 15));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
