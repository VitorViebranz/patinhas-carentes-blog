import { describe, expect, it } from 'vitest';
import {
    formatBrazilianPhone,
    formatCnpj,
    instagramUrl,
    normalizeText,
    slugify,
    whatsappUrl,
} from './text';

describe('normalizeText', () => {
    it('ignores accents and case', () => {
        expect(normalizeText('  São Francisco do Sul ')).toBe('sao francisco do sul');
    });
});

describe('slugify', () => {
    it('makes URL-safe slugs', () => {
        expect(slugify('Oi, eu sou a Mel!')).toBe('oi-eu-sou-a-mel');
        expect(slugify('Ninhada resgatada essa semana')).toBe('ninhada-resgatada-essa-semana');
    });

    it('returns an empty string when nothing usable is left', () => {
        expect(slugify('???')).toBe('');
    });
});

describe('formatCnpj', () => {
    it('formats 14 digits and leaves anything else untouched', () => {
        expect(formatCnpj('45559299000157')).toBe('45.559.299/0001-57');
        expect(formatCnpj('45.559.299/0001-57')).toBe('45.559.299/0001-57');
        expect(formatCnpj('chave-aleatoria')).toBe('chave-aleatoria');
    });
});

describe('contact helpers', () => {
    it('formats Brazilian phone numbers', () => {
        expect(formatBrazilianPhone('5547991457757')).toBe('(47) 99145-7757');
        expect(formatBrazilianPhone('4732782606')).toBe('(47) 3278-2606');
        expect(formatBrazilianPhone('abc')).toBe('abc');
    });

    it('builds WhatsApp and Instagram links', () => {
        expect(whatsappUrl('5547991457757')).toBe('https://wa.me/5547991457757');
        expect(whatsappUrl('5547991457757', 'Olá! Tudo bem?')).toBe(
            'https://wa.me/5547991457757?text=Ol%C3%A1!%20Tudo%20bem%3F',
        );
        expect(instagramUrl('@patinhas')).toBe('https://www.instagram.com/patinhas/');
        expect(instagramUrl('patinhas')).toBe('https://www.instagram.com/patinhas/');
    });
});
