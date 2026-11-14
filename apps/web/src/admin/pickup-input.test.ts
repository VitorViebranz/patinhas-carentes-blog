import { describe, expect, it } from 'vitest';
import { isStale, parseKg } from './pickup-input';

describe('parseKg', () => {
    it('accepts a comma or a dot as the decimal separator', () => {
        expect(parseKg('12,5')).toBe(12.5);
        expect(parseKg('12.5')).toBe(12.5);
        expect(parseKg(' 8 ')).toBe(8);
    });

    it('rejects empty, zero, negative and text', () => {
        expect(parseKg('')).toBeNull();
        expect(parseKg('0')).toBeNull();
        expect(parseKg('-3')).toBeNull();
        expect(parseKg('doze')).toBeNull();
    });

    it('rejects more than two decimals and absurd weights', () => {
        expect(parseKg('1,234')).toBeNull();
        expect(parseKg('1.234,5')).toBeNull();
        expect(parseKg('5001')).toBeNull();
        expect(parseKg('5000')).toBe(5000);
    });
});

describe('isStale', () => {
    it('flags a point that has gone 45 days or more without a pickup', () => {
        expect(isStale(44)).toBe(false);
        expect(isStale(45)).toBe(true);
    });
});
