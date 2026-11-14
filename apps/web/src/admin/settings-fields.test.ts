import { describe, expect, it } from 'vitest';
import type { AdminSettings } from '../services/api/admin-types';
import { SETTING_GROUPS, type SettingField } from './settings-fields';

const data: AdminSettings = {
    gramsPerCap: 2.5,
    kgPriceBrl: 2,
    spayCostBrl: 350,
    vaccineDoseCostBrl: 60,
    kgPer100LBag: 20,
    doseGoalKg: 30,
    goalKg: 175,
    monthlyAverageKg: 0,
    animalsServedYear: null,
    cnpj: null,
    pixKey: null,
    whatsappNumber: '5547991457757',
    instagramHandle: null,
    adoptionUrl: null,
    hiddenFeatures: [],
    updatedAt: '2026-10-27T00:00:00.000Z',
};

function field(id: string): SettingField {
    const found = SETTING_GROUPS.flatMap((group) => group.fields).find((item) => item.id === id);
    if (!found) throw new Error(`Unknown setting ${id}`);
    return found;
}

describe('setting fields', () => {
    it('formats the saved values the way the person types them', () => {
        expect(field('gramsPerCap').format(data)).toBe('2,5');
        expect(field('animalsServedYear').format(data)).toBe('');
        expect(field('whatsappNumber').format(data)).toBe('5547991457757');
    });

    it('accepts a decimal comma and sends only the field that changed', () => {
        expect(field('gramsPerCap').parse('2,8')).toEqual({
            ok: true,
            payload: { gramsPerCap: 2.8 },
        });
    });

    it.each(['spayCostBrl', 'kgPriceBrl', 'gramsPerCap'])('%s must be greater than zero', (id) => {
        expect(field(id).parse('0').ok).toBe(false);
        expect(field(id).parse('').ok).toBe(false);
        expect(field(id).parse('abc').ok).toBe(false);
    });

    it('allows zero for the monthly average and blank for the animals served', () => {
        expect(field('monthlyAverageKg').parse('0')).toEqual({
            ok: true,
            payload: { monthlyAverageKg: 0 },
        });
        expect(field('animalsServedYear').parse('')).toEqual({
            ok: true,
            payload: { animalsServedYear: null },
        });
        expect(field('animalsServedYear').parse('12,5').ok).toBe(false);
    });

    it('keeps only the digits of the WhatsApp number and rejects short ones', () => {
        expect(field('whatsappNumber').parse('+55 (47) 99145-7757')).toEqual({
            ok: true,
            payload: { whatsappNumber: '5547991457757' },
        });
        expect(field('whatsappNumber').parse('12345').ok).toBe(false);
        expect(field('whatsappNumber').parse('')).toEqual({
            ok: true,
            payload: { whatsappNumber: null },
        });
    });

    it('removes the @ from the Instagram handle', () => {
        expect(field('instagramHandle').parse('@patinhas.carentes')).toEqual({
            ok: true,
            payload: { instagramHandle: 'patinhas.carentes' },
        });
        expect(field('instagramHandle').parse('com espaco').ok).toBe(false);
    });

    it('requires 14 digits for the CNPJ and a web link for the adoption page', () => {
        expect(field('cnpj').parse('45.559.299/0001-57')).toEqual({
            ok: true,
            payload: { cnpj: '45559299000157' },
        });
        expect(field('cnpj').parse('123').ok).toBe(false);
        expect(field('adoptionUrl').parse('https://exemplo.org/adocao').ok).toBe(true);
        expect(field('adoptionUrl').parse('javascript:alert(1)').ok).toBe(false);
        expect(field('adoptionUrl').parse('exemplo.org').ok).toBe(false);
    });

    it('hints how many kilos pay for one spay', () => {
        const hint = field('kgPriceBrl').hint;
        expect(typeof hint === 'function' ? hint(data) : hint).toBe(
            'Uma castração equivale a 175 kg de tampinhas.',
        );
    });
});
