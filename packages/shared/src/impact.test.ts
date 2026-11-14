import { describe, expect, it } from 'vitest';
import {
    calculateImpact,
    capsForKg,
    describeGroupEffect,
    describeReais,
    describeSpayShare,
    describeWeight,
    formatCaps,
    goalCaps,
    goalKg,
    groupImpact,
} from './impact';

const settings = { gramsPerCap: 2.5, kgPriceBrl: 2, spayCostBrl: 350 };

describe('goal of a neutering', () => {
    it('is 175 kg and 70,000 caps with the settings confirmed by the NGO', () => {
        expect(goalKg(settings)).toBe(175);
        expect(goalCaps(settings)).toBe(70_000);
    });

    it('follows the settings', () => {
        expect(goalKg({ ...settings, spayCostBrl: 400 })).toBe(200);
        expect(goalCaps({ ...settings, gramsPerCap: 5 })).toBe(35_000);
    });
});

describe('calculateImpact', () => {
    it('converts caps to kg, reais and share of a neutering', () => {
        const impact = calculateImpact(400, settings);

        expect(impact).toEqual({ caps: 400, kg: 1, reais: 2, spayFraction: 2 / 350 });
    });

    it('treats 400 caps as 1 kg and R$ 2.00', () => {
        const impact = calculateImpact(400, settings);

        expect(impact.kg).toBe(1);
        expect(impact.reais).toBe(2);
    });

    it('keeps the value between 0 and the meter maximum', () => {
        expect(calculateImpact(-50, settings).caps).toBe(0);
        expect(calculateImpact(999_999, settings).caps).toBe(2000);
        expect(calculateImpact(Number.NaN, settings).caps).toBe(0);
    });

    it('accepts a custom maximum', () => {
        expect(calculateImpact(999_999, settings, 5000).caps).toBe(5000);
    });
});

describe('groupImpact', () => {
    it('multiplies by the number of people without a ceiling', () => {
        const impact = groupImpact(100, settings, 100);

        expect(impact.caps).toBe(10_000);
        expect(impact.kg).toBe(25);
        expect(impact.reais).toBe(50);
        expect(impact.spayFraction).toBeCloseTo(50 / 350);
    });
});

describe('capsForKg', () => {
    it('matches the meter milestones: 1 kg is 400 caps and 5 kg is 2,000', () => {
        expect(capsForKg(1, settings)).toBe(400);
        expect(capsForKg(2.5, settings)).toBe(1000);
        expect(capsForKg(5, settings)).toBe(2000);
    });
});

describe('impact texts (pt-BR)', () => {
    it('formats caps with the Brazilian thousands separator', () => {
        expect(formatCaps(2000)).toBe('2.000');
        expect(formatCaps(70_000)).toBe('70.000');
    });

    it('describes weight in grams below 1 kg and in kg above', () => {
        expect(describeWeight(0)).toBe('nenhuma ainda');
        expect(describeWeight(0.25)).toBe('cerca de 250 g');
        expect(describeWeight(5)).toBe('cerca de 5 kg');
        expect(describeWeight(1.5)).toBe('cerca de 1,5 kg');
        expect(describeWeight(1250)).toBe('cerca de 1.250 kg');
    });

    it('formats reais with a plain space after the symbol', () => {
        expect(describeReais(0.5)).toBe('R$ 0,50');
        expect(describeReais(1000)).toBe('R$ 1.000,00');
    });

    it('describes the share of a neutering with decimals that fit the size', () => {
        expect(describeSpayShare(0.0014)).toBe('0,14% de uma castração');
        expect(describeSpayShare(0.0057)).toBe('0,57% de uma castração');
        expect(describeSpayShare(0.05)).toBe('5,0% de uma castração');
        expect(describeSpayShare(0.4)).toBe('40% de uma castração');
        expect(describeSpayShare(2.857)).toBe('2,9 castrações');
    });

    it('describes what a group of 100 people can do', () => {
        const text = describeGroupEffect(groupImpact(100, settings, 100), 100);

        expect(text).toBe(
            'Se 100 pessoas doarem a mesma quantidade, são 10.000 tampinhas: R$ 50,00, ou 14% de uma castração.',
        );
    });
});
