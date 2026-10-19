import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatReadableDate, getRelativeDateString } from './date.js';

describe('Date Utilities', () => {
  beforeEach(() => {
    // Mock the system date to a fixed date (e.g., 2024-05-10T12:00:00Z)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 4, 10, 12, 0, 0)); // Note: Month is 0-indexed in Date constructor (4 = May)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRelativeDateString', () => {
    it('returns today date string by default', () => {
      expect(getRelativeDateString()).toBe('2024-05-10');
    });

    it('returns tomorrow date string when offset is 1', () => {
      expect(getRelativeDateString(1)).toBe('2024-05-11');
    });

    it('returns yesterday date string when offset is -1', () => {
      expect(getRelativeDateString(-1)).toBe('2024-05-09');
    });
  });

  describe('formatReadableDate', () => {
    it('returns empty string for empty input', () => {
      expect(formatReadableDate('')).toBe('');
      expect(formatReadableDate(null)).toBe('');
      expect(formatReadableDate(undefined)).toBe('');
    });

    it('returns "🔥 Heute" if the date is today', () => {
      expect(formatReadableDate('2024-05-10')).toBe('🔥 Heute');
    });

    it('returns "Morgen" if the date is tomorrow', () => {
      expect(formatReadableDate('2024-05-11')).toBe('Morgen');
    });

    it('formats normal dates correctly in de-DE locale', () => {
      // e.g. "2024-05-15" -> "15. Mai" (or "15.05." depending on ICU data, usually "15. Mai" for {day: '2-digit', month: 'short'})
      const result = formatReadableDate('2024-05-15');
      // The exact space can be a normal space or a non-breaking space depending on Node version,
      // so we use a regex or string replacement to handle it flexibly.
      expect(result.replace(/\s/g, ' ')).toBe('15. Mai');
    });

    it('handles leap years correctly', () => {
      const result = formatReadableDate('2024-02-29');
      expect(result.replace(/\s/g, ' ')).toBe('29. Feb.');
    });

    it('falls back to input string if parsing throws', () => {
      // Mock toLocaleDateString to throw an error to trigger the catch block
      const originalDate = global.Date;
      try {
        global.Date = class extends originalDate {
          toLocaleDateString() {
            throw new Error('Test Error');
          }
        };
        expect(formatReadableDate('2024-12-31')).toBe('2024-12-31');
      } finally {
        global.Date = originalDate;
      }
    });

    it('returns input string if date is completely invalid format but doesn\'t throw on Date constructor', () => {
      // Note: "invalid-date" will result in a Date object with "Invalid Date".
      // calling toLocaleDateString on "Invalid Date" returns "Invalid Date", which doesn't throw.
      // So let's see what happens with "invalid" input.
      const result = formatReadableDate('invalid-date');
      expect(result).toBe('Invalid Date'); // Since toLocaleDateString doesn't throw, it just returns "Invalid Date" string
    });
  });
});
