export const BRAZIL_OFFSET_MS = -3 * 3_600_000;

function format(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function previousMonth(now: Date): string {
    const local = new Date(now.getTime() + BRAZIL_OFFSET_MS);
    const year = local.getUTCFullYear();
    const monthIndex = local.getUTCMonth();
    return monthIndex === 0 ? format(year - 1, 11) : format(year, monthIndex - 1);
}
