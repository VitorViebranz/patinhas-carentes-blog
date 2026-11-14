export const STALE_PICKUP_DAYS = 45;
export const MAX_PICKUP_KG = 5_000;

export function parseKg(text: string): number | null {
    const normalized = text.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const kg = Number(normalized);
    return kg > 0 && kg <= MAX_PICKUP_KG ? kg : null;
}

export function isStale(daysSinceLastPickup: number): boolean {
    return daysSinceLastPickup >= STALE_PICKUP_DAYS;
}
