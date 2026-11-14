import { describe, expect, it } from 'vitest';
import {
    JOINVILLE_CENTER,
    directionsUrl,
    distanceMeters,
    formatDistance,
    isSearchActive,
    isTooFarFromJoinville,
    matchesSearch,
    parseCoordinates,
    rankByDistance,
    telHref,
} from './geo';

const point = (name: string, latitude: number, longitude: number) => ({
    name,
    latitude,
    longitude,
});

describe('distanceMeters', () => {
    it('is zero for the same place', () => {
        expect(distanceMeters(JOINVILLE_CENTER, JOINVILLE_CENTER)).toBe(0);
    });

    it('measures about 1.11 km per 0.01 degree of latitude', () => {
        const north = {
            latitude: JOINVILLE_CENTER.latitude + 0.01,
            longitude: JOINVILLE_CENTER.longitude,
        };

        expect(distanceMeters(JOINVILLE_CENTER, north)).toBeGreaterThan(1100);
        expect(distanceMeters(JOINVILLE_CENTER, north)).toBeLessThan(1120);
    });
});

describe('rankByDistance', () => {
    it('orders from nearest to farthest and keeps the distance', () => {
        const far = point('far', -26.4, -48.85);
        const near = point('near', -26.305, -48.849);

        const ranked = rankByDistance([far, near], JOINVILLE_CENTER);

        expect(ranked.map((row) => row.item.name)).toEqual(['near', 'far']);
        expect(ranked[0]?.distanceMeters).toBeLessThan(ranked[1]?.distanceMeters ?? 0);
    });

    it('keeps the original order for equal distances', () => {
        const a = point('a', -26.31, -48.85);
        const b = point('b', -26.31, -48.85);

        expect(rankByDistance([a, b], JOINVILLE_CENTER).map((row) => row.item.name)).toEqual([
            'a',
            'b',
        ]);
    });

    it('returns an empty list for no points', () => {
        expect(rankByDistance([], JOINVILLE_CENTER)).toEqual([]);
    });
});

describe('formatDistance', () => {
    it('uses meters rounded to 10 below 950 m', () => {
        expect(formatDistance(350)).toBe('a 350 m');
        expect(formatDistance(347)).toBe('a 350 m');
        expect(formatDistance(10)).toBe('a 10 m');
    });

    it('uses kilometers with a decimal comma from 950 m', () => {
        expect(formatDistance(1000)).toBe('a 1,0 km');
        expect(formatDistance(2400)).toBe('a 2,4 km');
    });
});

describe('isTooFarFromJoinville', () => {
    it('is true when even the nearest point is over 40 km away', () => {
        expect(isTooFarFromJoinville([{ item: 1, distanceMeters: 40_001 }])).toBe(true);
    });

    it('is false near the points and when there are no points', () => {
        expect(isTooFarFromJoinville([{ item: 1, distanceMeters: 39_000 }])).toBe(false);
        expect(isTooFarFromJoinville([])).toBe(false);
    });
});

describe('matchesSearch', () => {
    const clinic = {
        name: 'Clínica Vet',
        address: 'R. Anita Garibaldi, 46',
        neighborhood: 'São Pedro',
    };

    it('ignores accents and case in name, address and neighborhood', () => {
        expect(matchesSearch(clinic, 'CLINICA')).toBe(true);
        expect(matchesSearch(clinic, 'garibaldi')).toBe(true);
        expect(matchesSearch(clinic, 'sao pedro')).toBe(true);
        expect(matchesSearch(clinic, 'mercado')).toBe(false);
    });

    it('does not filter with fewer than 2 letters', () => {
        expect(matchesSearch(clinic, 'x')).toBe(true);
        expect(isSearchActive('x')).toBe(false);
        expect(isSearchActive(' ab ')).toBe(true);
    });

    it('handles points without address', () => {
        expect(matchesSearch({ name: 'A', address: null, neighborhood: 'Itaum' }, 'itaum')).toBe(
            true,
        );
    });
});

describe('links', () => {
    it('searches by address and city, without the place name, when the position is approximate', () => {
        const inside = directionsUrl({
            name: 'Loja',
            address: 'R. A, 1',
            neighborhood: 'Centro',
            outsideMainArea: false,
            locationPrecision: 'NEIGHBORHOOD',
        });
        const outside = directionsUrl({
            name: 'Loja',
            address: null,
            neighborhood: 'Garuva',
            outsideMainArea: true,
        });

        expect(decodeURIComponent(inside)).toContain('query=R. A, 1, Centro, Joinville, SC');
        expect(decodeURIComponent(inside)).not.toContain('Loja');
        expect(decodeURIComponent(outside)).toContain('Loja, Garuva, SC');
        expect(decodeURIComponent(outside)).not.toContain('Joinville');
    });

    it('sends the exact coordinates when the position is known', () => {
        const url = directionsUrl({
            name: 'Casa',
            address: 'Rua X, 60',
            neighborhood: 'Bom Retiro',
            outsideMainArea: false,
            latitude: -26.2801,
            longitude: -48.8402,
            locationPrecision: 'HOUSE_NUMBER',
        });

        expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=-26.2801,-48.8402');
    });

    it('reads coordinates typed by hand or copied from Google Maps', () => {
        expect(parseCoordinates('-26.2801, -48.8402')).toEqual({
            latitude: -26.2801,
            longitude: -48.8402,
        });
        expect(parseCoordinates('-26,2801 -48,8402')).toEqual({
            latitude: -26.2801,
            longitude: -48.8402,
        });
        expect(
            parseCoordinates(
                'https://www.google.com/maps/place/Casa/@-26.2801,-48.8402,17z/data=x',
            ),
        ).toEqual({ latitude: -26.2801, longitude: -48.8402 });
        expect(parseCoordinates('https://maps/data=!3d-26.28!4d-48.84')).toEqual({
            latitude: -26.28,
            longitude: -48.84,
        });
    });

    it('rejects coordinates that are invalid or far from Joinville', () => {
        expect(parseCoordinates('abc')).toBeNull();
        expect(parseCoordinates('-48.84, -26.28')).toBeNull();
        expect(parseCoordinates('40.71, -74.0')).toBeNull();
    });

    it('builds a tel link with the Brazilian country code', () => {
        expect(telHref('(47) 3278-2606')).toBe('tel:+554732782606');
    });
});
