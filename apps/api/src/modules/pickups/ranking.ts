interface Rankable {
    name: string;
    totalKg: number;
}

export function rankEntries<T extends Rankable>(entries: readonly T[]): (T & { rank: number })[] {
    const sorted = [...entries].sort(
        (a, b) => b.totalKg - a.totalKg || a.name.localeCompare(b.name, 'pt-BR'),
    );
    const ranked: (T & { rank: number })[] = [];
    for (const [index, entry] of sorted.entries()) {
        const previous = ranked[index - 1];
        const rank = previous && previous.totalKg === entry.totalKg ? previous.rank : index + 1;
        ranked.push({ ...entry, rank });
    }
    return ranked;
}
