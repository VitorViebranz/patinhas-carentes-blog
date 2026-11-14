import { describe, expect, it } from 'vitest';
import {
    monthState,
    previousMonth,
    recentMonths,
    shortMonthLabel,
    yearSummary,
} from './report-months';

describe('previousMonth', () => {
    it('is the month before the current one in Brasília time', () => {
        expect(previousMonth(new Date('2026-10-31T15:00:00Z'))).toBe('2026-09');
    });

    it('goes back to December across the new year', () => {
        expect(previousMonth(new Date('2026-01-10T15:00:00Z'))).toBe('2025-12');
    });

    it('still counts the old month right after midnight UTC, before midnight in Brasília', () => {
        expect(previousMonth(new Date('2026-11-01T01:00:00Z'))).toBe('2026-09');
        expect(previousMonth(new Date('2026-11-01T03:30:00Z'))).toBe('2026-10');
    });
});

describe('recentMonths', () => {
    it('lists the last six months, newest first, without the current one', () => {
        expect(recentMonths(new Date('2026-03-15T12:00:00Z'))).toEqual([
            '2026-02',
            '2026-01',
            '2025-12',
            '2025-11',
            '2025-10',
            '2025-09',
        ]);
    });
});

describe('monthState', () => {
    const reports = [
        { month: '2026-09', status: 'PUBLISHED' as const, totalKg: 1 },
        { month: '2026-08', status: 'DRAFT' as const, totalKg: 1 },
    ];

    it('tells published, draft and missing apart', () => {
        expect(monthState('2026-09', reports)).toBe('published');
        expect(monthState('2026-08', reports)).toBe('draft');
        expect(monthState('2026-07', reports)).toBe('missing');
    });
});

describe('shortMonthLabel', () => {
    it('writes the first three letters and the year', () => {
        expect(shortMonthLabel('2026-09')).toBe('Set/26');
        expect(shortMonthLabel('2025-12')).toBe('Dez/25');
    });
});

describe('yearSummary', () => {
    const reports = [
        { month: '2026-09', status: 'PUBLISHED' as const, totalKg: 1500 },
        { month: '2026-08', status: 'PUBLISHED' as const, totalKg: 1300 },
        { month: '2026-07', status: 'DRAFT' as const, totalKg: 9999 },
        { month: '2025-12', status: 'PUBLISHED' as const, totalKg: 700 },
    ];

    it('sums only the published months of that year', () => {
        expect(yearSummary(reports, '2026', 175)).toEqual({
            months: 2,
            kg: 2800,
            castrations: 16,
        });
    });

    it('is empty for a year with nothing published', () => {
        expect(yearSummary(reports, '2024', 175)).toEqual({ months: 0, kg: 0, castrations: 0 });
    });
});
