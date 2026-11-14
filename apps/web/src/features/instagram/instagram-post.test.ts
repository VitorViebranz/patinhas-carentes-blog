import { describe, expect, it } from 'vitest';
import { buildPostTexts } from './instagram-post';

const base = {
    month: '2026-09',
    goalKg: 175,
    doseKg: 30,
    gramsPerCap: 2.5,
    outcome: '',
    instagram: 'patinhascarentesjoinville',
};

describe('buildPostTexts', () => {
    it('shows caps and what is left for the first neutering', () => {
        const texts = buildPostTexts({ ...base, totalKg: 128 });
        expect(texts.headline).toBe('128 kg');
        expect(texts.subtitle).toBe(
            '51.200 tampinhas em setembro de 2026. Faltam 47 kg para uma castração.',
        );
        expect(texts.caption).toContain('cerca de 51.200 unidades');
    });

    it('counts the neutering paid by the month and what is left for the next', () => {
        const texts = buildPostTexts({ ...base, totalKg: 1500 });
        expect(texts.subtitle).toBe(
            '600.000 tampinhas em setembro de 2026: o suficiente para 8 castrações. Faltam 75 kg para a próxima.',
        );
        expect(texts.caption).toContain(
            'cerca de 600.000 unidades, o suficiente para 8 castrações.',
        );
    });

    it('uses the singular for one neutering', () => {
        const texts = buildPostTexts({ ...base, totalKg: 180 });
        expect(texts.subtitle).toContain('o suficiente para 1 castração.');
    });

    it('adds the outcome once, with a single final period', () => {
        const texts = buildPostTexts({
            ...base,
            totalKg: 100,
            outcome: '1 castração e ração para 20 dias.',
        });
        expect(texts.caption).toContain(
            'unidades. 1 castração e ração para 20 dias. Cada tampinha',
        );
    });

    it('never shows negative kilos', () => {
        expect(buildPostTexts({ ...base, totalKg: -5 }).headline).toBe('0 kg');
    });
});
