import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import {
    FakeGeocoder,
    FakePostalLookup,
    call,
    createAndLogin,
    createNeighborhood,
    resetDatabase,
} from '../../../test/helpers/kit';

const geocoder = new FakeGeocoder();
const postalLookup = new FakePostalLookup();
let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp({}, undefined, { geocoder, postalLookup });
    await app.ready();
});
afterAll(async () => {
    await app.close();
});
beforeEach(async () => {
    await resetDatabase(app);
    geocoder.queries.length = 0;
    geocoder.setResult({ latitude: -26.31, longitude: -48.84 });
    postalLookup.queries.length = 0;
    postalLookup.setResult(null);
});

describe('GET /postal-codes/:code', () => {
    it('returns the street and neighborhood of a postal code without a session', async () => {
        postalLookup.setResult({
            postalCode: '89223-005',
            street: 'Rua Afonso Frederico Leopoldo',
            neighborhood: 'Bom Retiro',
            city: 'Joinville',
            state: 'SC',
        });

        const response = await app.inject('/api/v1/postal-codes/89223-005');

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({ street: 'Rua Afonso Frederico Leopoldo' });
        expect(postalLookup.queries).toEqual(['89223005']);
    });

    it('answers 404 when the postal code does not exist and 400 when it is malformed', async () => {
        const missing = await app.inject('/api/v1/postal-codes/89223005');
        const malformed = await app.inject('/api/v1/postal-codes/123');

        expect(missing.statusCode).toBe(404);
        expect(malformed.statusCode).toBe(400);
    });
});

describe('POST /admin/geocode-preview', () => {
    it('returns the found position without saving anything', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);

        const response = await call(app, cookie, 'POST', '/api/v1/admin/geocode-preview', {
            address: 'Rua A, 10',
            neighborhoodId: hood.id,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            found: true,
            latitude: -26.31,
            longitude: -48.84,
            locationPrecision: 'HOUSE_NUMBER',
        });
    });

    it('returns the neighborhood position with found false when the address is unknown', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        geocoder.setResult(null);

        const response = await call(app, cookie, 'POST', '/api/v1/admin/geocode-preview', {
            address: 'Rua Que Nao Existe, 1',
            neighborhoodId: hood.id,
        });

        expect(response.json()).toMatchObject({
            found: false,
            latitude: hood.latitude,
            locationPrecision: 'NEIGHBORHOOD',
        });
    });

    it('answers 404 for an unknown neighborhood', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const response = await call(app, cookie, 'POST', '/api/v1/admin/geocode-preview', {
            address: 'Rua A, 10',
            neighborhoodId: '00000000-0000-4000-8000-000000000000',
        });

        expect(response.statusCode).toBe(404);
    });
});

describe('POST /admin/neighborhoods/from-postal-code', () => {
    const url = '/api/v1/admin/neighborhoods/from-postal-code';
    const joinvilleAddress = {
        postalCode: '89220-000',
        street: 'Rua Nova',
        neighborhood: 'Bairro Novo',
        city: 'Joinville',
        state: 'SC',
    };

    it('creates the neighborhood from the postal code and places it with the geocoder', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        postalLookup.setResult(joinvilleAddress);

        const response = await call(app, cookie, 'POST', url, { postalCode: '89220-000' });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            created: true,
            neighborhood: {
                name: 'Bairro Novo',
                slug: 'bairro-novo',
                latitude: -26.31,
                longitude: -48.84,
                outsideMainArea: false,
                pointCount: 0,
            },
        });
        expect(geocoder.queries).toEqual(['Bairro Novo, Joinville, SC, Brasil']);
        expect(await app.prisma.neighborhood.count({ where: { slug: 'bairro-novo' } })).toBe(1);
    });

    it('returns the existing neighborhood without calling the geocoder', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const existing = await createNeighborhood(app, { name: 'São Marcos', slug: 'sao-marcos' });
        postalLookup.setResult({ ...joinvilleAddress, neighborhood: 'Sao Marcos' });

        const response = await call(app, cookie, 'POST', url, { postalCode: '89220000' });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            created: false,
            neighborhood: { id: existing.id },
        });
        expect(geocoder.queries).toEqual([]);
    });

    it('falls back to the street when the neighborhood name is not found on the map', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        postalLookup.setResult(joinvilleAddress);
        geocoder.setSequence(null, { latitude: -26.29, longitude: -48.83 });

        const response = await call(app, cookie, 'POST', url, { postalCode: '89220000' });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            created: true,
            neighborhood: { latitude: -26.29, longitude: -48.83 },
        });
        expect(geocoder.queries).toEqual([
            'Bairro Novo, Joinville, SC, Brasil',
            'Rua Nova, Bairro Novo, Joinville, SC, Brasil',
        ]);
    });

    it('refuses to create a neighborhood that cannot be placed inside Joinville', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        postalLookup.setResult(joinvilleAddress);
        geocoder.setResult({ latitude: -23.55, longitude: -46.63 });

        const response = await call(app, cookie, 'POST', url, { postalCode: '89220000' });

        expect(response.statusCode).toBe(422);
        expect(response.json()).toMatchObject({ error: { code: 'NEIGHBORHOOD_NOT_LOCATED' } });
        expect(await app.prisma.neighborhood.count()).toBe(0);
    });

    it('refuses postal codes from another city', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        postalLookup.setResult({ ...joinvilleAddress, city: 'Araquari' });

        const response = await call(app, cookie, 'POST', url, { postalCode: '89220000' });

        expect(response.statusCode).toBe(422);
        expect(response.json()).toMatchObject({ error: { code: 'POSTAL_CODE_OTHER_CITY' } });
        expect(await app.prisma.neighborhood.count()).toBe(0);
    });

    it('refuses postal codes that have no neighborhood', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        postalLookup.setResult({ ...joinvilleAddress, neighborhood: '' });

        const response = await call(app, cookie, 'POST', url, { postalCode: '89220000' });

        expect(response.statusCode).toBe(422);
        expect(response.json()).toMatchObject({
            error: { code: 'POSTAL_CODE_WITHOUT_NEIGHBORHOOD' },
        });
    });

    it('answers 404 for an unknown postal code, 400 for a malformed one and 401 without a session', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const missing = await call(app, cookie, 'POST', url, { postalCode: '89220000' });
        const malformed = await call(app, cookie, 'POST', url, { postalCode: '123' });
        const anonymous = await call(app, null, 'POST', url, { postalCode: '89220000' });

        expect(missing.statusCode).toBe(404);
        expect(malformed.statusCode).toBe(400);
        expect(anonymous.statusCode).toBe(401);
    });
});

describe('POST /admin/neighborhoods', () => {
    const url = '/api/v1/admin/neighborhoods';

    it('registers a missing neighborhood by name, formatted as a proper name', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const response = await call(app, cookie, 'POST', url, { name: ' jardim DA paz ' });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            created: true,
            neighborhood: { name: 'Jardim da Paz', slug: 'jardim-da-paz', pointCount: 0 },
        });
        expect(geocoder.queries).toEqual(['jardim DA paz, Joinville, SC, Brasil']);
    });

    it('returns the existing neighborhood when the name only differs by case or accents', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const existing = await createNeighborhood(app, { name: 'Iririú', slug: 'iriru' });

        const response = await call(app, cookie, 'POST', url, { name: 'IRIRÚ' });

        expect(response.json()).toMatchObject({
            created: false,
            neighborhood: { id: existing.id },
        });
        expect(geocoder.queries).toEqual([]);
    });

    it('refuses a name that cannot be found inside Joinville', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        geocoder.setResult({ latitude: -23.55, longitude: -46.63 });

        const response = await call(app, cookie, 'POST', url, { name: 'Bairro Inventado' });

        expect(response.statusCode).toBe(422);
        expect(response.json()).toMatchObject({ error: { code: 'NEIGHBORHOOD_NOT_LOCATED' } });
        expect(await app.prisma.neighborhood.count()).toBe(0);
    });

    it('answers 400 for a name that is too short and 401 without a session', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const short = await call(app, cookie, 'POST', url, { name: 'a' });
        const anonymous = await call(app, null, 'POST', url, { name: 'Centro Novo' });

        expect(short.statusCode).toBe(400);
        expect(anonymous.statusCode).toBe(401);
    });
});
