import { describe, expect, it } from 'vitest';
import { brazilToday, dateOnly, formatDateOnly, periodStart } from './periods';

describe('brazilToday', () => {
    it('uses the Brasília date, not the UTC one, late at night', () => {
        expect(brazilToday(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10-31');
    });

    it('keeps the same day during the afternoon', () => {
        expect(brazilToday(new Date('2026-10-31T18:00:00Z'))).toBe('2026-10-31');
    });
});

describe('periodStart', () => {
    const now = new Date('2026-10-31T15:00:00Z');

    it('starts the month on day 1', () => {
        expect(formatDateOnly(periodStart('month', now) as Date)).toBe('2026-10-01');
    });

    it('starts the year on January 1st', () => {
        expect(formatDateOnly(periodStart('year', now) as Date)).toBe('2026-01-01');
    });

    it('has no start for all time', () => {
        expect(periodStart('all', now)).toBeNull();
    });

    it('moves to the new month only after midnight in Brasília', () => {
        const justBefore = new Date('2026-11-01T02:59:00Z');
        const justAfter = new Date('2026-11-01T03:00:00Z');

        expect(formatDateOnly(periodStart('month', justBefore) as Date)).toBe('2026-10-01');
        expect(formatDateOnly(periodStart('month', justAfter) as Date)).toBe('2026-11-01');
    });
});

describe('dateOnly', () => {
    it('round trips a calendar date', () => {
        expect(formatDateOnly(dateOnly('2026-02-28'))).toBe('2026-02-28');
    });
});
