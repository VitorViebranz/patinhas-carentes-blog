import { describe, expect, it } from 'vitest';
import { NominatimGeocoder } from './geocoder';

function geocoderWith(responses: unknown[], calls: { url: string; ua: string | undefined }[]) {
    let index = 0;
    return new NominatimGeocoder({
        baseUrl: 'https://nominatim.test',
        userAgent: 'TestAgent/1.0',
        minIntervalMs: 0,
        fetchImpl: async (url, init) => {
            calls.push({ url, ua: init.headers['user-agent'] });
            const body = responses[index++];
            return { ok: body !== 'error', json: async () => body };
        },
    });
}

describe('NominatimGeocoder', () => {
    it('returns coordinates and identifies itself with the configured User-Agent', async () => {
        const calls: { url: string; ua: string | undefined }[] = [];
        const geocoder = geocoderWith([[{ lat: '-26.3', lon: '-48.85' }]], calls);

        const result = await geocoder.geocode('Rua X, 1, Joinville');

        expect(result).toEqual({ latitude: -26.3, longitude: -48.85 });
        expect(calls[0]?.ua).toBe('TestAgent/1.0');
        expect(calls[0]?.url).toContain('q=Rua+X%2C+1%2C+Joinville');
    });

    it('returns null when nothing is found, the response is bad or the values are invalid', async () => {
        const geocoder = geocoderWith(
            [[], 'error', [{ lat: 'abc', lon: '1' }], [{ lat: '99', lon: '1' }]],
            [],
        );

        expect(await geocoder.geocode('a')).toBeNull();
        expect(await geocoder.geocode('b')).toBeNull();
        expect(await geocoder.geocode('c')).toBeNull();
        expect(await geocoder.geocode('d')).toBeNull();
    });

    it('returns null instead of throwing when the network fails', async () => {
        const geocoder = new NominatimGeocoder({
            baseUrl: 'https://nominatim.test',
            userAgent: 'x',
            minIntervalMs: 0,
            fetchImpl: async () => {
                throw new Error('offline');
            },
        });

        expect(await geocoder.geocode('a')).toBeNull();
    });

    it('waits between requests to respect the usage policy', async () => {
        const geocoder = new NominatimGeocoder({
            baseUrl: 'https://nominatim.test',
            userAgent: 'x',
            minIntervalMs: 60,
            fetchImpl: async () => ({ ok: true, json: async () => [] }),
        });

        const start = Date.now();
        await Promise.all([geocoder.geocode('a'), geocoder.geocode('b'), geocoder.geocode('c')]);

        expect(Date.now() - start).toBeGreaterThanOrEqual(110);
    });
});
