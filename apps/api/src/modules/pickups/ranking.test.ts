import { describe, expect, it } from 'vitest';
import { rankEntries } from './ranking';

describe('rankEntries', () => {
    it('orders by weight, heaviest first', () => {
        const ranked = rankEntries([
            { name: 'B', totalKg: 10 },
            { name: 'A', totalKg: 30 },
            { name: 'C', totalKg: 20 },
        ]);

        expect(ranked.map((entry) => [entry.name, entry.rank])).toEqual([
            ['A', 1],
            ['C', 2],
            ['B', 3],
        ]);
    });

    it('shares a position on a tie and skips the next one', () => {
        const ranked = rankEntries([
            { name: 'Escola Sol', totalKg: 40 },
            { name: 'Colégio Alfa', totalKg: 40 },
            { name: 'Loja Lua', totalKg: 15 },
        ]);

        expect(ranked.map((entry) => [entry.name, entry.rank])).toEqual([
            ['Colégio Alfa', 1],
            ['Escola Sol', 1],
            ['Loja Lua', 3],
        ]);
    });

    it('does not change the list it receives', () => {
        const input = [
            { name: 'B', totalKg: 1 },
            { name: 'A', totalKg: 2 },
        ];

        rankEntries(input);

        expect(input.map((entry) => entry.name)).toEqual(['B', 'A']);
    });

    it('returns an empty list for no entries', () => {
        expect(rankEntries([])).toEqual([]);
    });
});
