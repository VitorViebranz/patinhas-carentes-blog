import { describe, expect, it } from 'vitest';
import { monthlyReportFigures } from './reports';

describe('monthlyReportFigures', () => {
    it('converts kg to caps using the cap weight', () => {
        expect(monthlyReportFigures(1500, 175, 2.5).capCount).toBe(600_000);
    });

    it('counts full neutering and what is missing for the next one', () => {
        expect(monthlyReportFigures(1500, 175, 2.5)).toMatchObject({
            castrations: 8,
            remainingKg: 75,
        });
    });

    it('has no full neutering below the goal', () => {
        expect(monthlyReportFigures(128, 175, 2.5)).toMatchObject({
            castrations: 0,
            remainingKg: 47,
        });
    });

    it('asks for a whole new goal when the total is an exact multiple', () => {
        expect(monthlyReportFigures(1400, 175, 2.5)).toMatchObject({
            castrations: 8,
            remainingKg: 175,
        });
    });

    it('rounds the remainder to cents of a kilo', () => {
        expect(monthlyReportFigures(100.1, 175, 2.5).remainingKg).toBe(74.9);
    });
});

describe('monthlyReportFigures doses', () => {
    it('counts whole vaccine doses and what is missing for the next', () => {
        expect(monthlyReportFigures(1500, 175, 2.5, 30)).toMatchObject({
            doses: 50,
            remainingKgToNextDose: 30,
        });
        expect(monthlyReportFigures(1510, 175, 2.5, 30)).toMatchObject({
            doses: 50,
            remainingKgToNextDose: 20,
        });
    });
});
