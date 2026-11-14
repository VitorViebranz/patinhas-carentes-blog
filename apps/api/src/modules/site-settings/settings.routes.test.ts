import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, createNeighborhood, resetDatabase } from '../../../test/helpers/kit';

interface SettingsBody {
    gramsPerCap: number;
    kgPriceBrl: number;
    spayCostBrl: number;
    goalKg: number;
    monthlyAverageKg: number;
    animalsServedYear: number | null;
    cnpj: string | null;
    pixKey: string | null;
    whatsappNumber: string | null;
    instagramHandle: string | null;
    adoptionUrl: string | null;
    collectionPointCount: number;
    neighborhoodCount: number;
}

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
});
afterAll(async () => {
    await app.close();
});
beforeEach(async () => {
    await resetDatabase(app);
});

describe('GET /site-settings (public)', () => {
    it('returns the defaults on a fresh database, with counts taken from the data', async () => {
        const hood = await createNeighborhood(app);
        await createNeighborhood(app);
        await app.prisma.collectionPoint.create({
            data: {
                name: 'A',
                neighborhoodId: hood.id,
                category: 'PET_VET',
                latitude: -26.3,
                longitude: -48.85,
                locationPrecision: 'STREET',
            },
        });

        const response = await app.inject('/api/v1/site-settings');

        expect(response.statusCode).toBe(200);
        expect(response.json<SettingsBody>()).toMatchObject({
            gramsPerCap: 2.5,
            kgPriceBrl: 2,
            spayCostBrl: 350,
            goalKg: 175,
            monthlyAverageKg: 0,
            animalsServedYear: null,
            collectionPointCount: 1,
            neighborhoodCount: 2,
        });
        expect(response.headers['etag']).toBeTruthy();
    });
});

describe('admin site settings', () => {
    it('lets any staff member read, but only an ADMIN change them', async () => {
        const editor = await createAndLogin(app, 'EDITOR');
        const admin = await createAndLogin(app, 'ADMIN');

        const read = await call(app, editor.cookie, 'GET', '/api/v1/admin/site-settings');
        const denied = await call(app, editor.cookie, 'PATCH', '/api/v1/admin/site-settings', {
            spayCostBrl: 400,
        });
        const anonymous = await call(app, null, 'PATCH', '/api/v1/admin/site-settings', {
            spayCostBrl: 400,
        });
        const allowed = await call(app, admin.cookie, 'PATCH', '/api/v1/admin/site-settings', {
            spayCostBrl: 400,
            monthlyAverageKg: 1500,
            animalsServedYear: 320,
            cnpj: '45559299000157',
            pixKey: '45559299000157',
            whatsappNumber: '5547991457757',
            instagramHandle: 'patinhas',
            adoptionUrl: 'https://example.org/adote',
        });

        expect([
            read.statusCode,
            denied.statusCode,
            anonymous.statusCode,
            allowed.statusCode,
        ]).toEqual([200, 403, 401, 200]);
        const publicView = (await app.inject('/api/v1/site-settings')).json<SettingsBody>();
        expect(publicView).toMatchObject({
            spayCostBrl: 400,
            goalKg: 200,
            monthlyAverageKg: 1500,
            animalsServedYear: 320,
            cnpj: '45559299000157',
            pixKey: '45559299000157',
            whatsappNumber: '5547991457757',
            instagramHandle: 'patinhas',
            adoptionUrl: 'https://example.org/adote',
        });
    });

    it('turns an empty string into "no value" and keeps untouched fields', async () => {
        const admin = await createAndLogin(app, 'ADMIN');
        await call(app, admin.cookie, 'PATCH', '/api/v1/admin/site-settings', {
            whatsappNumber: '5547991457757',
            spayCostBrl: 420,
        });

        await call(app, admin.cookie, 'PATCH', '/api/v1/admin/site-settings', {
            whatsappNumber: '',
        });

        const view = (await app.inject('/api/v1/site-settings')).json<SettingsBody>();
        expect(view.whatsappNumber).toBeNull();
        expect(view.spayCostBrl).toBe(420);
    });

    it('clears the number of animals served when null is sent', async () => {
        const admin = await createAndLogin(app, 'ADMIN');
        await call(app, admin.cookie, 'PATCH', '/api/v1/admin/site-settings', {
            animalsServedYear: 100,
        });

        await call(app, admin.cookie, 'PATCH', '/api/v1/admin/site-settings', {
            animalsServedYear: null,
        });

        const view = (await app.inject('/api/v1/site-settings')).json<SettingsBody>();
        expect(view.animalsServedYear).toBeNull();
    });

    it('validates values', async () => {
        const admin = await createAndLogin(app, 'ADMIN');
        const bodies = [
            { kgPriceBrl: 0 },
            { spayCostBrl: -1 },
            { gramsPerCap: -1 },
            { monthlyAverageKg: -5 },
            { animalsServedYear: 1.5 },
            { cnpj: '45.559.299/0001-57' },
            { whatsappNumber: '(47) 99999' },
            { instagramHandle: '@com arroba' },
            { adoptionUrl: 'javascript:alert(1)' },
            { goalKg: 100 },
            { unknown: 1 },
        ];

        for (const body of bodies) {
            const response = await call(
                app,
                admin.cookie,
                'PATCH',
                '/api/v1/admin/site-settings',
                body,
            );
            expect(response.statusCode, JSON.stringify(body)).toBe(400);
        }
    });
});
