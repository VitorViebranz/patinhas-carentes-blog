import { describe, expect, it } from 'vitest';
import { estimateKgFromBags } from './bags';

describe('estimateKgFromBags', () => {
    it('uses 8 kg per 100 L bag by default ratio', () => {
        expect(estimateKgFromBags(3, 100, 8)).toBe(24);
    });

    it('scales by bag volume', () => {
        expect(estimateKgFromBags(2, 50, 8)).toBe(8);
    });

    it('rounds to 2 decimals', () => {
        expect(estimateKgFromBags(1, 33, 8)).toBe(2.64);
    });

    it('rejects non-positive input', () => {
        expect(() => estimateKgFromBags(0, 100, 8)).toThrow();
        expect(() => estimateKgFromBags(1, 0, 8)).toThrow();
    });
});
