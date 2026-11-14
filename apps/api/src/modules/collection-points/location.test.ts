import { describe, expect, it } from 'vitest';
import { streetOnly } from './location';

describe('streetOnly', () => {
    it('removes the house number', () => {
        expect(streetOnly('Rua Afonso Frederico Leopoldo, 60')).toBe(
            'Rua Afonso Frederico Leopoldo',
        );
        expect(streetOnly('Av. Santos Dumont 1500')).toBe('Av. Santos Dumont');
        expect(streetOnly('Rua A, nº 12')).toBe('Rua A');
        expect(streetOnly('Rua B, s/n')).toBe('Rua B');
    });

    it('returns null when there is no number to remove', () => {
        expect(streetOnly('Rua Sem Numero')).toBeNull();
    });
});
