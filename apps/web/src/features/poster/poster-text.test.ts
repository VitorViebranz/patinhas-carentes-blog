import { describe, expect, it } from 'vitest';
import { posterMessage, posterName } from './poster-text';

describe('poster text', () => {
    it('uses the typed name', () => {
        expect(posterName('  Escola Aurora ')).toBe('Escola Aurora');
        expect(posterMessage('Escola Aurora')).toContain(
            'O(a) Escola Aurora agora é ponto de coleta',
        );
    });
    it('falls back when empty', () => {
        expect(posterName('   ')).toBe('Nome do seu espaço');
    });
});
