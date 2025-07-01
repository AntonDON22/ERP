import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getMoscowTime,
  formatMoscowTime,
  formatMoscowDate,
  formatMoscowDateTime,
  getCurrentMoscowTimeString,
  getCurrentMoscowDateString,
  getMoscowDateForDocument,
  MOSCOW_TIMEZONE_OFFSET
} from '../../shared/timeUtils';

describe('TimeUtils', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('getMoscowTime', () => {
    it('should return current time in Moscow timezone when no date provided', () => {
      const now = new Date('2025-07-01T12:00:00.000Z'); // UTC
      vi.setSystemTime(now);
      
      const moscowTime = getMoscowTime();
      const expectedTime = new Date(now.getTime() + MOSCOW_TIMEZONE_OFFSET * 60 * 60 * 1000);
      
      expect(moscowTime.getTime()).toBe(expectedTime.getTime());
    });

    it('should convert provided date to Moscow timezone', () => {
      const utcDate = new Date('2025-07-01T09:30:00.000Z');
      const moscowTime = getMoscowTime(utcDate);
      
      // 09:30 UTC + 3 часа = 12:30 MSK
      expect(moscowTime.getHours()).toBe(12);
      expect(moscowTime.getMinutes()).toBe(30);
    });

    it('should handle date crossing midnight', () => {
      const utcDate = new Date('2025-07-01T22:00:00.000Z');
      const moscowTime = getMoscowTime(utcDate);
      
      // 22:00 UTC + 3 часа = 01:00 MSK следующего дня
      expect(moscowTime.getDate()).toBe(2); // Следующий день
      expect(moscowTime.getHours()).toBe(1);
    });
  });

  describe('formatMoscowTime', () => {
    it('should format time in HH:MM:SS format', () => {
      const date = new Date('2025-07-01T15:30:45.000Z');
      const formatted = formatMoscowTime(date);
      
      // 15:30:45 UTC + 3 часа = 18:30:45 MSK
      expect(formatted).toBe('18:30:45');
    });

    it('should format current time when no date provided', () => {
      const now = new Date('2025-07-01T06:15:30.000Z');
      vi.setSystemTime(now);
      
      const formatted = formatMoscowTime();
      
      // 06:15:30 UTC + 3 часа = 09:15:30 MSK
      expect(formatted).toBe('09:15:30');
    });

    it('should pad single digits with zeros', () => {
      const date = new Date('2025-07-01T03:05:08.000Z');
      const formatted = formatMoscowTime(date);
      
      // 03:05:08 UTC + 3 часа = 06:05:08 MSK
      expect(formatted).toBe('06:05:08');
    });
  });

  describe('formatMoscowDate', () => {
    it('should format date in DD.MM.YYYY format', () => {
      const date = new Date('2025-07-15T12:00:00.000Z');
      const formatted = formatMoscowDate(date);
      
      expect(formatted).toBe('15.07.2025');
    });

    it('should handle date changes due to timezone offset', () => {
      const date = new Date('2025-07-01T21:30:00.000Z');
      const formatted = formatMoscowDate(date);
      
      // 21:30 UTC + 3 часа = 00:30 MSK следующего дня
      expect(formatted).toBe('02.07.2025');
    });

    it('should pad single digit days and months', () => {
      const date = new Date('2025-01-05T12:00:00.000Z');
      const formatted = formatMoscowDate(date);
      
      expect(formatted).toBe('05.01.2025');
    });
  });

  describe('formatMoscowDateTime', () => {
    it('should format date and time together', () => {
      const date = new Date('2025-07-01T14:30:45.000Z');
      const formatted = formatMoscowDateTime(date);
      
      // 14:30:45 UTC + 3 часа = 17:30:45 MSK
      expect(formatted).toBe('01.07.2025 17:30:45');
    });

    it('should handle timezone crossing midnight', () => {
      const date = new Date('2025-07-01T21:30:00.000Z');
      const formatted = formatMoscowDateTime(date);
      
      // 21:30 UTC + 3 часа = 00:30 MSK следующего дня
      expect(formatted).toBe('02.07.2025 00:30:00');
    });
  });

  describe('getCurrentMoscowTimeString', () => {
    it('should return current Moscow time as string', () => {
      const now = new Date('2025-07-01T10:15:30.000Z');
      vi.setSystemTime(now);
      
      const timeString = getCurrentMoscowTimeString();
      
      // 10:15:30 UTC + 3 часа = 13:15:30 MSK
      expect(timeString).toBe('13:15:30');
    });
  });

  describe('getCurrentMoscowDateString', () => {
    it('should return current Moscow date as string', () => {
      const now = new Date('2025-07-01T10:00:00.000Z');
      vi.setSystemTime(now);
      
      const dateString = getCurrentMoscowDateString();
      
      expect(dateString).toBe('01.07.2025');
    });

    it('should handle date change due to timezone', () => {
      const now = new Date('2025-07-01T22:00:00.000Z');
      vi.setSystemTime(now);
      
      const dateString = getCurrentMoscowDateString();
      
      // 22:00 UTC + 3 часа = 01:00 MSK следующего дня
      expect(dateString).toBe('02.07.2025');
    });
  });

  describe('getMoscowDateForDocument', () => {
    it('should return date in YYYY-MM-DD format for documents', () => {
      const now = new Date('2025-07-01T15:30:00.000Z');
      vi.setSystemTime(now);
      
      const documentDate = getMoscowDateForDocument();
      
      expect(documentDate).toBe('2025-07-01');
    });

    it('should handle timezone crossing date boundary', () => {
      const now = new Date('2025-07-01T21:30:00.000Z');
      vi.setSystemTime(now);
      
      const documentDate = getMoscowDateForDocument();
      
      // 21:30 UTC + 3 часа = 00:30 MSK следующего дня
      expect(documentDate).toBe('2025-07-02');
    });

    it('should pad single digit months and days', () => {
      const now = new Date('2025-01-05T12:00:00.000Z');
      vi.setSystemTime(now);
      
      const documentDate = getMoscowDateForDocument();
      
      expect(documentDate).toBe('2025-01-05');
    });
  });

  describe('Constants', () => {
    it('should have correct Moscow timezone offset', () => {
      expect(MOSCOW_TIMEZONE_OFFSET).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundary crossing', () => {
      const date = new Date('2024-12-31T22:00:00.000Z');
      const moscowTime = getMoscowTime(date);
      
      // 22:00 UTC 31 декабря + 3 часа = 01:00 MSK 1 января
      expect(moscowTime.getFullYear()).toBe(2025);
      expect(moscowTime.getMonth()).toBe(0); // Январь
      expect(moscowTime.getDate()).toBe(1);
    });

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29T12:00:00.000Z');
      const formatted = formatMoscowDate(date);
      
      expect(formatted).toBe('29.02.2024');
    });

    it('should handle daylight saving time transitions', () => {
      // Москва не переходит на летнее время с 2014 года
      const winterDate = new Date('2025-01-15T12:00:00.000Z');
      const summerDate = new Date('2025-07-15T12:00:00.000Z');
      
      const winterMoscow = getMoscowTime(winterDate);
      const summerMoscow = getMoscowTime(summerDate);
      
      // Оба должны иметь одинаковую разницу с UTC (+3 часа)
      expect(winterMoscow.getHours()).toBe(15);
      expect(summerMoscow.getHours()).toBe(15);
    });
  });
});