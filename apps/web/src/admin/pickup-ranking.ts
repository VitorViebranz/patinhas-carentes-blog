import type { PickupSummary } from '../services/api/admin-types';

interface PointLike {
    id: string;
    name: string;
    neighborhood: string;
}

export interface RankingRow {
    rank: number;
    pointId: string;
    name: string;
    neighborhood: string;
    totalKg: number;
    pickups: number;
    lastPickupOn: string | null;
}

export function buildRanking(
    points: readonly PointLike[],
    summary: readonly PickupSummary[],
): RankingRow[] {
    const byPoint = new Map(points.map((point) => [point.id, point]));
    const rows = summary.flatMap((item) => {
        const point = byPoint.get(item.pointId);
        return point
            ? [
                  {
                      pointId: point.id,
                      name: point.name,
                      neighborhood: point.neighborhood,
                      totalKg: item.totalKg,
                      pickups: item.pickups,
                      lastPickupOn: item.lastPickupOn,
                  },
              ]
            : [];
    });
    rows.sort((a, b) => b.totalKg - a.totalKg || a.name.localeCompare(b.name, 'pt-BR'));

    const ranked: RankingRow[] = [];
    for (const [index, row] of rows.entries()) {
        const previous = ranked[index - 1];
        ranked.push({
            ...row,
            rank: previous && previous.totalKg === row.totalKg ? previous.rank : index + 1,
        });
    }
    return ranked;
}
