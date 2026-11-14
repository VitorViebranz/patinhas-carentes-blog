export const DEFAULT_KG_PER_100L_BAG = 8;

export function estimateKgFromBags(bags: number, bagLiters: number, kgPer100L: number): number {
    if (!(bags > 0) || !(bagLiters > 0) || !(kgPer100L > 0)) {
        throw new RangeError('bags, bagLiters and kgPer100L must be positive');
    }
    return Math.round(bags * (bagLiters / 100) * kgPer100L * 100) / 100;
}
