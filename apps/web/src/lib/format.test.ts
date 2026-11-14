import { describe, expect, it } from 'vitest';
import {
    daysSince,
    describeLastPickup,
    formatDay,
    formatKg,
    formatMonth,
    formatShortDate,
    paragraphs,
    todayInBrazil,
} from './format';

describe('format', () => {
    it('formats a report month', () => {
        expect(formatMonth('2026-09')).toBe('Setembro de 2026');
        expect(formatMonth('xx')).toBe('xx');
    });
    it('formats a short date in Brazil time', () => {
        expect(formatShortDate('2026-09-13T15:00:00.000Z')).toBe('13 set 2026');
    });
    it('splits paragraphs at blank lines', () => {
        expect(paragraphs('um\n\n\ndois\nainda dois\n\n')).toEqual(['um', 'dois\nainda dois']);
    });
});

describe('pickup format', () => {
    const now = new Date('2026-10-31T15:00:00Z');

    it('gives today in Brasília time, even after midnight UTC', () => {
        expect(todayInBrazil(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10-31');
        expect(todayInBrazil(now)).toBe('2026-10-31');
    });

    it('writes a weight with one decimal and the Brazilian separator', () => {
        expect(formatKg(1234.56)).toBe('1.234,6 kg');
        expect(formatKg(7)).toBe('7 kg');
    });

    it('writes a calendar day without shifting it by the time zone', () => {
        expect(formatDay('2026-10-01')).toBe('1 out 2026');
        expect(formatDay('2026-12-31')).toBe('31 dez 2026');
    });

    it('counts the days since a date in Brasília time', () => {
        expect(daysSince('2026-10-31', now)).toBe(0);
        expect(daysSince('2026-10-21', now)).toBe(10);
        expect(daysSince('2026-10-30', new Date('2026-11-01T01:00:00Z'))).toBe(1);
    });

    it('never goes negative for a date ahead of today', () => {
        expect(daysSince('2026-11-05', now)).toBe(0);
    });

    it('describes how long ago the last pickup was', () => {
        expect(describeLastPickup(null, now)).toBe('Nunca');
        expect(describeLastPickup('2026-10-31', now)).toBe('Hoje');
        expect(describeLastPickup('2026-10-30', now)).toBe('Ontem');
        expect(describeLastPickup('2026-10-01', now)).toBe('Há 30 dias');
    });
});
