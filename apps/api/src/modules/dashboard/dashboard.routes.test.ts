import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, createNeighborhood, resetDatabase } from '../../../test/helpers/kit';
import { previousMonth } from '../../lib/months';

interface DashboardBody {
    activePoints: number;
    newHelpRequests: number;
    pointsWithoutPhone: number;
    approximateLocationPoints: number;
    pendingReport: { month: string; status: string };
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

describe('GET /admin/dashboard', () => {
    it('requires a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/dashboard')).statusCode).toBe(401);
    });

    it('counts what needs attention', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const hood = await createNeighborhood(app);
        const base = {
            neighborhoodId: hood.id,
            category: 'PET_VET' as const,
            latitude: -26.3,
            longitude: -48.85,
        };
        await app.prisma.collectionPoint.createMany({
            data: [
                {
                    ...base,
                    name: 'Com telefone',
                    phone: '(47) 1',
                    locationPrecision: 'HOUSE_NUMBER',
                },
                { ...base, name: 'Sem telefone', locationPrecision: 'NEIGHBORHOOD' },
                {
                    ...base,
                    name: 'Inativo sem telefone',
                    locationPrecision: 'STREET',
                    status: 'INACTIVE',
                },
            ],
        });
        await app.prisma.helpRequest.createMany({
            data: [
                {
                    type: 'FOSTER',
                    requesterName: 'A',
                    contact: 'a@example.com',
                    consentGivenAt: new Date(),
                },
                {
                    type: 'FOSTER',
                    requesterName: 'B',
                    contact: 'b@example.com',
                    consentGivenAt: new Date(),
                    status: 'ANSWERED',
                },
            ],
        });

        const response = await call(app, cookie, 'GET', '/api/v1/admin/dashboard');

        expect(response.json<DashboardBody>()).toMatchObject({
            activePoints: 2,
            newHelpRequests: 1,
            pointsWithoutPhone: 1,
            approximateLocationPoints: 1,
        });
    });

    it('tells whether last month report is missing, a draft or published', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const month = previousMonth(new Date());

        const missing = await call(app, cookie, 'GET', '/api/v1/admin/dashboard');
        await app.prisma.monthlyReport.create({ data: { month, totalKg: 10 } });
        const draft = await call(app, cookie, 'GET', '/api/v1/admin/dashboard');
        await app.prisma.monthlyReport.update({ where: { month }, data: { status: 'PUBLISHED' } });
        const published = await call(app, cookie, 'GET', '/api/v1/admin/dashboard');

        expect(missing.json<DashboardBody>().pendingReport).toEqual({ month, status: 'MISSING' });
        expect(draft.json<DashboardBody>().pendingReport.status).toBe('DRAFT');
        expect(published.json<DashboardBody>().pendingReport.status).toBe('PUBLISHED');
    });
});
