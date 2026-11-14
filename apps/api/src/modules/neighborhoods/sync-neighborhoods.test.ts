import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { FakeGeocoder, createNeighborhood, resetDatabase } from '../../../test/helpers/kit';
import { syncNeighborhoods } from './sync-neighborhoods';

const geocoder = new FakeGeocoder();
let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp({}, undefined, { geocoder });
    await app.ready();
});
afterAll(async () => {
    await app.close();
});
beforeEach(async () => {
    await resetDatabase(app);
    geocoder.queries.length = 0;
    geocoder.setResult({ latitude: -26.31, longitude: -48.84 });
});

describe('syncNeighborhoods', () => {
    it('creates the missing names and leaves the existing ones alone', async () => {
        await createNeighborhood(app, { name: 'Centro', slug: 'centro' });

        const report = await syncNeighborhoods(app.prisma, geocoder, [
            { name: 'Centro' },
            { name: 'Dona Francisca' },
        ]);

        expect(report).toEqual({ created: ['Dona Francisca'], existing: ['Centro'], failed: [] });
        expect(geocoder.queries).toEqual(['Dona Francisca, Joinville, SC, Brasil']);
        expect(await app.prisma.neighborhood.count({ where: { slug: 'dona-francisca' } })).toBe(1);
    });

    it('reports the names the map cannot place and keeps going', async () => {
        geocoder.setSequence(null, { latitude: -26.29, longitude: -48.83 });

        const report = await syncNeighborhoods(app.prisma, geocoder, [
            { name: 'Marinas' },
            { name: 'Vale Verde' },
        ]);

        expect(report.failed).toEqual([{ name: 'Marinas', reason: 'NEIGHBORHOOD_NOT_LOCATED' }]);
        expect(report.created).toEqual(['Vale Verde']);
    });

    it('uses the coordinates written in the list without asking the map', async () => {
        const report = await syncNeighborhoods(app.prisma, geocoder, [
            { name: 'Zona Industrial Tupy', latitude: -26.27, longitude: -48.85 },
        ]);

        expect(report.created).toEqual(['Zona Industrial Tupy']);
        expect(geocoder.queries).toEqual([]);
        const saved = await app.prisma.neighborhood.findUnique({
            where: { slug: 'zona-industrial-tupy' },
        });
        expect(saved).toMatchObject({ latitude: -26.27, longitude: -48.85 });
    });

    it('refuses written coordinates that are outside Joinville', async () => {
        const report = await syncNeighborhoods(app.prisma, geocoder, [
            { name: 'Zona Industrial Norte', latitude: -23.55, longitude: -46.63 },
        ]);

        expect(report.failed).toEqual([
            { name: 'Zona Industrial Norte', reason: 'COORDINATES_OUTSIDE_JOINVILLE' },
        ]);
        expect(await app.prisma.neighborhood.count()).toBe(0);
    });

    it('can run twice without duplicating anything', async () => {
        const list = [{ name: 'Dona Francisca' }];

        await syncNeighborhoods(app.prisma, geocoder, list);
        const second = await syncNeighborhoods(app.prisma, geocoder, list);

        expect(second.existing).toEqual(['Dona Francisca']);
        expect(await app.prisma.neighborhood.count()).toBe(1);
    });
});
