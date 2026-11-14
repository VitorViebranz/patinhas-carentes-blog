import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import {
    FakeGeocoder,
    call,
    createAndLogin,
    createNeighborhood,
    resetDatabase,
} from '../../../test/helpers/kit';

interface PointBody {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    locationPrecision: string;
    status: string;
    locationSource?: string;
    outsideMainArea: boolean;
}

interface ListBody {
    items: PointBody[];
    meta: { total: number; totalPages: number };
}

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

async function createPoint(
    neighborhoodId: string,
    data: {
        name: string;
        address?: string | null;
        phone?: string | null;
        status?: 'ACTIVE' | 'INACTIVE';
    },
) {
    return app.prisma.collectionPoint.create({
        data: {
            name: data.name,
            neighborhoodId,
            address: data.address ?? null,
            phone: data.phone ?? null,
            category: 'PET_VET',
            latitude: -26.3,
            longitude: -48.85,
            locationPrecision: 'HOUSE_NUMBER',
            status: data.status ?? 'ACTIVE',
        },
    });
}

describe('GET /collection-points (public)', () => {
    it('returns only active points, with an ETag and short cache', async () => {
        const hood = await createNeighborhood(app, { name: 'Centro' });
        await createPoint(hood.id, { name: 'Ativo' });
        await createPoint(hood.id, { name: 'Inativo', status: 'INACTIVE' });

        const response = await app.inject('/api/v1/collection-points');

        const body = response.json<ListBody>();
        expect(response.statusCode).toBe(200);
        expect(body.items.map((item) => item.name)).toEqual(['Ativo']);
        expect(response.headers['etag']).toBeTruthy();
        expect(response.headers['cache-control']).toContain('max-age=');
    });

    it('answers 304 when the ETag still matches and a new body when data changed', async () => {
        const hood = await createNeighborhood(app);
        await createPoint(hood.id, { name: 'A' });
        const first = await app.inject('/api/v1/collection-points');
        const etag = String(first.headers['etag']);

        const again = await app.inject({
            url: '/api/v1/collection-points',
            headers: { 'if-none-match': etag },
        });
        await createPoint(hood.id, { name: 'B' });
        const changed = await app.inject({
            url: '/api/v1/collection-points',
            headers: { 'if-none-match': etag },
        });

        expect(again.statusCode).toBe(304);
        expect(changed.statusCode).toBe(200);
        expect(changed.json<ListBody>().items).toHaveLength(2);
    });

    it('does not expose internal fields', async () => {
        const hood = await createNeighborhood(app);
        await createPoint(hood.id, { name: 'A' });

        const response = await app.inject('/api/v1/collection-points');

        expect(response.body).not.toContain('"status"');
        expect(response.body).not.toContain('createdAt');
    });
});

describe('GET /neighborhoods (public)', () => {
    it('lists neighborhoods with the count of active points', async () => {
        const hood = await createNeighborhood(app, { name: 'Centro' });
        await createNeighborhood(app, { name: 'Vazio' });
        await createPoint(hood.id, { name: 'A' });
        await createPoint(hood.id, { name: 'B', status: 'INACTIVE' });

        const response = await app.inject('/api/v1/neighborhoods');

        const items = response.json<{ items: { name: string; pointCount: number }[] }>().items;
        expect(items.find((item) => item.name === 'Centro')?.pointCount).toBe(1);
        expect(items.find((item) => item.name === 'Vazio')?.pointCount).toBe(0);
    });
});

describe('admin collection points: permissions', () => {
    it('requires a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/collection-points')).statusCode).toBe(
            401,
        );
    });

    it('is open to EDITOR users', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        expect((await call(app, cookie, 'GET', '/api/v1/admin/collection-points')).statusCode).toBe(
            200,
        );
    });
});

describe('POST /admin/collection-points', () => {
    it('geocodes the address and keeps the precision it implies', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app, { name: 'Anita Garibaldi' });

        const response = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            name: 'Loja Nova',
            neighborhoodId: hood.id,
            address: 'R. Anita Garibaldi, 46',
            category: 'PET_VET',
        });

        expect(response.statusCode).toBe(201);
        expect(response.json<PointBody>()).toMatchObject({
            latitude: -26.31,
            longitude: -48.84,
            locationPrecision: 'HOUSE_NUMBER',
            locationSource: 'geocoded',
            status: 'ACTIVE',
        });
        expect(geocoder.queries[0]).toBe(
            'R. Anita Garibaldi, 46, Anita Garibaldi, Joinville, SC, Brasil',
        );
    });

    it('uses street precision when the address has no number', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);

        const response = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            name: 'Loja',
            neighborhoodId: hood.id,
            address: 'Rua Sem Numero',
            category: 'HEALTH',
        });

        expect(response.json<PointBody>().locationPrecision).toBe('STREET');
    });

    it('falls back to the neighborhood position when geocoding fails, never leaving it without coordinates', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        geocoder.setResult(null);

        const response = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            name: 'Loja',
            neighborhoodId: hood.id,
            address: 'Rua Que Nao Existe, 1',
            category: 'EDUCATION',
        });

        expect(response.statusCode).toBe(201);
        expect(response.json<PointBody>()).toMatchObject({
            latitude: hood.latitude,
            longitude: hood.longitude,
            locationPrecision: 'NEIGHBORHOOD',
            locationSource: 'neighborhood-fallback',
        });
    });

    it('retries with the street only when the full address is not found', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        geocoder.setSequence(null, { latitude: -26.28, longitude: -48.84 });

        const response = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            name: 'Casa',
            neighborhoodId: hood.id,
            address: 'Rua Afonso Frederico Leopoldo, 60',
            category: 'EDUCATION',
        });

        expect(geocoder.queries).toHaveLength(2);
        expect(geocoder.queries[1]).toContain('Rua Afonso Frederico Leopoldo,');
        expect(geocoder.queries[1]).not.toContain('60');
        expect(response.json<PointBody>()).toMatchObject({
            latitude: -26.28,
            locationPrecision: 'STREET',
            locationSource: 'geocoded',
        });
    });

    it('uses coordinates typed by hand without calling the geocoder', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);

        const response = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            name: 'Loja',
            neighborhoodId: hood.id,
            address: 'Rua X, 10',
            category: 'GROCERY_FOOD',
            latitude: -26.25,
            longitude: -48.9,
            locationPrecision: 'HOUSE_NUMBER',
        });

        expect(response.json<PointBody>()).toMatchObject({
            latitude: -26.25,
            longitude: -48.9,
            locationSource: 'manual',
        });
        expect(geocoder.queries).toHaveLength(0);
    });

    it('marks points of outside neighborhoods as outside the main area', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app, { name: 'Garuva', outsideMainArea: true });

        const response = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            name: 'Loja',
            neighborhoodId: hood.id,
            category: 'COMMERCE_SERVICES',
        });

        expect(response.json<PointBody>().outsideMainArea).toBe(true);
        expect(geocoder.queries).toHaveLength(0);
    });

    it('validates input: coordinate range, lone coordinate, unknown neighborhood, unknown field', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const base = { name: 'Loja', neighborhoodId: hood.id, category: 'PET_VET' };

        const outOfRange = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            ...base,
            latitude: 91,
            longitude: 0,
        });
        const lone = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            ...base,
            latitude: -26.3,
        });
        const unknownHood = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            ...base,
            neighborhoodId: '019a0000-0000-7000-8000-000000000000',
        });
        const extra = await call(app, cookie, 'POST', '/api/v1/admin/collection-points', {
            ...base,
            status: 'ACTIVE ',
            id: 'x',
        });

        expect(outOfRange.statusCode).toBe(400);
        expect(lone.statusCode).toBe(400);
        expect(unknownHood.statusCode).toBe(400);
        expect(extra.statusCode).toBe(400);
    });
});

describe('PATCH and DELETE /admin/collection-points/:id', () => {
    it('re-geocodes only when the address changes', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const point = await createPoint(hood.id, { name: 'A', address: 'Rua A, 1' });

        const phoneOnly = await call(
            app,
            cookie,
            'PATCH',
            `/api/v1/admin/collection-points/${point.id}`,
            {
                phone: '(47) 3333-4444',
            },
        );
        const withAddress = await call(
            app,
            cookie,
            'PATCH',
            `/api/v1/admin/collection-points/${point.id}`,
            {
                address: 'Rua B, 2',
            },
        );

        expect(phoneOnly.json<PointBody>().locationSource).toBe('unchanged');
        expect(withAddress.json<PointBody>().locationSource).toBe('geocoded');
        expect(geocoder.queries).toHaveLength(1);
    });

    it('clears the phone when an empty string is sent', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const point = await createPoint(hood.id, { name: 'A', phone: '(47) 1111-2222' });

        await call(app, cookie, 'PATCH', `/api/v1/admin/collection-points/${point.id}`, {
            phone: '',
        });

        const stored = await app.prisma.collectionPoint.findUniqueOrThrow({
            where: { id: point.id },
        });
        expect(stored.phone).toBeNull();
    });

    it('deactivates instead of deleting, and the point leaves the public list', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const point = await createPoint(hood.id, { name: 'A' });

        const response = await call(
            app,
            cookie,
            'DELETE',
            `/api/v1/admin/collection-points/${point.id}`,
        );

        expect(response.json<PointBody>().status).toBe('INACTIVE');
        expect(await app.prisma.collectionPoint.count()).toBe(1);
        expect((await app.inject('/api/v1/collection-points')).json<ListBody>().items).toHaveLength(
            0,
        );
    });

    it('returns 404 for an unknown point', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const response = await call(
            app,
            cookie,
            'PATCH',
            '/api/v1/admin/collection-points/019a0000-0000-7000-8000-000000000000',
            { name: 'x' },
        );

        expect(response.statusCode).toBe(404);
    });
});

describe('GET /admin/collection-points filters', () => {
    async function seedFilterData() {
        const centro = await createNeighborhood(app, { name: 'São Pedro' });
        const other = await createNeighborhood(app, { name: 'Itaum' });
        await createPoint(centro.id, { name: 'Clínica Vet', address: 'Rua A, 1', phone: '(47) 1' });
        await createPoint(centro.id, { name: 'Mercado Bom', address: 'Rua B, 2' });
        const approx = await createPoint(other.id, { name: 'Escola Azul', phone: '(47) 2' });
        await app.prisma.collectionPoint.update({
            where: { id: approx.id },
            data: { locationPrecision: 'NEIGHBORHOOD' },
        });
        return { centro, other };
    }

    it('searches ignoring accents and case, in name, address and neighborhood', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        await seedFilterData();

        const byName = await call(app, cookie, 'GET', '/api/v1/admin/collection-points?q=CLINICA');
        const byHood = await call(
            app,
            cookie,
            'GET',
            '/api/v1/admin/collection-points?q=sao%20pedro',
        );

        expect(byName.json<ListBody>().items.map((item) => item.name)).toEqual(['Clínica Vet']);
        expect(byHood.json<ListBody>().meta.total).toBe(2);
    });

    it('filters points without phone and with approximate position', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        await seedFilterData();

        const noPhone = await call(
            app,
            cookie,
            'GET',
            '/api/v1/admin/collection-points?missingPhone=true',
        );
        const approx = await call(
            app,
            cookie,
            'GET',
            '/api/v1/admin/collection-points?approximateLocation=true',
        );

        expect(noPhone.json<ListBody>().items.map((item) => item.name)).toEqual(['Mercado Bom']);
        expect(approx.json<ListBody>().items.map((item) => item.name)).toEqual(['Escola Azul']);
    });

    it('filters by neighborhood and paginates', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const { centro } = await seedFilterData();

        const filtered = await call(
            app,
            cookie,
            'GET',
            `/api/v1/admin/collection-points?neighborhoodId=${centro.id}&pageSize=1&page=2`,
        );

        const body = filtered.json<ListBody>();
        expect(body.items).toHaveLength(1);
        expect(body.meta).toMatchObject({ total: 2, totalPages: 2 });
    });

    it('rejects a page size above 100', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const response = await call(
            app,
            cookie,
            'GET',
            '/api/v1/admin/collection-points?pageSize=101',
        );

        expect(response.statusCode).toBe(400);
    });
});

describe('POST /admin/collection-points/:id/geocode', () => {
    it('updates the coordinates when the address is found', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const point = await createPoint(hood.id, { name: 'A', address: 'Rua A, 1' });
        geocoder.setResult({ latitude: -26.2, longitude: -48.7 });

        const response = await call(
            app,
            cookie,
            'POST',
            `/api/v1/admin/collection-points/${point.id}/geocode`,
        );

        expect(response.statusCode).toBe(200);
        expect(response.json<PointBody>()).toMatchObject({ latitude: -26.2, longitude: -48.7 });
    });

    it('answers 422 GEOCODING_FAILED and keeps the old position when nothing is found', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const point = await createPoint(hood.id, { name: 'A', address: 'Rua A, 1' });
        geocoder.setResult(null);

        const response = await call(
            app,
            cookie,
            'POST',
            `/api/v1/admin/collection-points/${point.id}/geocode`,
        );

        expect(response.statusCode).toBe(422);
        expect(response.json<{ error: { code: string } }>().error.code).toBe('GEOCODING_FAILED');
        const stored = await app.prisma.collectionPoint.findUniqueOrThrow({
            where: { id: point.id },
        });
        expect(stored.latitude).toBe(-26.3);
    });

    it('answers 422 NO_ADDRESS for a point without address', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const point = await createPoint(hood.id, { name: 'A' });

        const response = await call(
            app,
            cookie,
            'POST',
            `/api/v1/admin/collection-points/${point.id}/geocode`,
        );

        expect(response.statusCode).toBe(422);
        expect(response.json<{ error: { code: string } }>().error.code).toBe('NO_ADDRESS');
    });

    it('is rate limited', async () => {
        const limited = await buildTestApp({ GEOCODE_RATE_LIMIT_MAX: '2' }, undefined, {
            geocoder,
        });
        await limited.ready();
        try {
            const { cookie } = await createAndLogin(limited, 'EDITOR');
            const hood = await createNeighborhood(limited);
            const point = await createPoint(hood.id, { name: 'A', address: 'Rua A, 1' });
            const statuses: number[] = [];
            for (let i = 0; i < 3; i += 1) {
                const response = await call(
                    limited,
                    cookie,
                    'POST',
                    `/api/v1/admin/collection-points/${point.id}/geocode`,
                );
                statuses.push(response.statusCode);
            }

            expect(statuses).toEqual([200, 200, 429]);
        } finally {
            await limited.close();
        }
    });
});
