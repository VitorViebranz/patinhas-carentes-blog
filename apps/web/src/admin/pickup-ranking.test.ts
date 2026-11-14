import { describe, expect, it } from 'vitest';
import { buildRanking } from './pickup-ranking';

const points = [
    { id: 'a', name: 'Escola Sol', neighborhood: 'Centro' },
    { id: 'b', name: 'Loja Lua', neighborhood: 'América' },
    { id: 'c', name: 'Colégio Alfa', neighborhood: 'Atiradores' },
];

const summary = (pointId: string, totalKg: number) => ({
    pointId,
    totalKg,
    pickups: 1,
    lastPickupOn: '2026-10-01',
});

describe('buildRanking', () => {
    it('orders the points by total weight, heaviest first', () => {
        const ranking = buildRanking(points, [
            summary('a', 10),
            summary('b', 30),
            summary('c', 20),
        ]);

        expect(ranking.map((row) => [row.rank, row.name])).toEqual([
            [1, 'Loja Lua'],
            [2, 'Colégio Alfa'],
            [3, 'Escola Sol'],
        ]);
    });

    it('shares a position on a tie and skips the next', () => {
        const ranking = buildRanking(points, [summary('a', 20), summary('b', 20), summary('c', 5)]);

        expect(ranking.map((row) => [row.rank, row.name])).toEqual([
            [1, 'Escola Sol'],
            [1, 'Loja Lua'],
            [3, 'Colégio Alfa'],
        ]);
    });

    it('leaves out points with no pickup and pickups of a point that is not in the list', () => {
        const ranking = buildRanking(points, [summary('a', 10), summary('gone', 99)]);

        expect(ranking).toHaveLength(1);
        expect(ranking[0]?.pointId).toBe('a');
    });

    it('is empty when there is nothing', () => {
        expect(buildRanking(points, [])).toEqual([]);
    });
});
