import { describe, expect, it } from 'vitest';
import { describePeriod } from './period';

describe('describePeriod', () => {
    it('names the month in lower case after "em"', () => {
        expect(describePeriod('month', '2026-10-01')).toBe('em outubro de 2026');
    });

    it('names the year', () => {
        expect(describePeriod('year', '2026-01-01')).toBe('em 2026');
    });

    it('says since the beginning for all time', () => {
        expect(describePeriod('all', null)).toBe('desde o início');
    });
});
