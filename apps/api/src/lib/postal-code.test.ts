import { describe, expect, it } from 'vitest';
import { ViaCepLookup, digitsOnly, formatPostalCode } from './postal-code';

const respond =
    (body: unknown, ok = true) =>
    async () => ({ ok, json: async () => body });

describe('ViaCepLookup', () => {
    it('maps the answer to street, neighborhood, city and state', async () => {
        const lookup = new ViaCepLookup({
            baseUrl: 'https://viacep.test',
            fetchImpl: respond({
                logradouro: 'Rua Afonso Frederico Leopoldo',
                bairro: 'Bom Retiro',
                localidade: 'Joinville',
                uf: 'SC',
            }),
        });

        expect(await lookup.lookup('89223-005')).toEqual({
            postalCode: '89223-005',
            street: 'Rua Afonso Frederico Leopoldo',
            neighborhood: 'Bom Retiro',
            city: 'Joinville',
            state: 'SC',
        });
    });

    it('returns null for unknown, malformed or failing lookups', async () => {
        const unknown = new ViaCepLookup({ baseUrl: 'x', fetchImpl: respond({ erro: true }) });
        const broken = new ViaCepLookup({ baseUrl: 'x', fetchImpl: respond({}, false) });
        const offline = new ViaCepLookup({
            baseUrl: 'x',
            fetchImpl: async () => {
                throw new Error('offline');
            },
        });
        const short = new ViaCepLookup({ baseUrl: 'x', fetchImpl: respond({}) });

        expect(await unknown.lookup('89223005')).toBeNull();
        expect(await broken.lookup('89223005')).toBeNull();
        expect(await offline.lookup('89223005')).toBeNull();
        expect(await short.lookup('123')).toBeNull();
    });

    it('formats digits', () => {
        expect(digitsOnly('89.223-005')).toBe('89223005');
        expect(formatPostalCode('89223005')).toBe('89223-005');
    });
});
