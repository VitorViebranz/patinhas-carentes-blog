import { GOAL_KG_PER_DOSE } from './constants';

export interface MonthlyReportFigures {
    capCount: number;
    castrations: number;
    doses: number;
    remainingKgToNextDose: number;

    remainingKg: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function monthlyReportFigures(
    totalKg: number,
    goalKg: number,
    gramsPerCap: number,
    doseKg: number = GOAL_KG_PER_DOSE,
): MonthlyReportFigures {
    return {
        capCount: Math.round((totalKg * 1000) / gramsPerCap),
        castrations: Math.floor(totalKg / goalKg),
        doses: Math.floor(totalKg / doseKg),
        remainingKgToNextDose: round2(doseKg - (totalKg % doseKg)),
        remainingKg: round2(goalKg - (totalKg % goalKg)),
    };
}
