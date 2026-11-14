import { describe, expect, it } from 'vitest';
import { previousMonth } from './months';

describe('previousMonth', () => {
    it('returns the month before the current one', () => {
        expect(previousMonth(new Date('2026-10-24T13:00:00Z'))).toBe('2026-09');
    });

    it('wraps around the year', () => {
        expect(previousMonth(new Date('2026-01-15T12:00:00Z'))).toBe('2025-12');
    });

    it('uses the Brazilian calendar date near midnight UTC', () => {
        expect(previousMonth(new Date('2026-11-01T01:00:00Z'))).toBe('2026-09');
    });
});
