import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, resetDatabase } from '../../../test/helpers/kit';

interface ReportBody {
    id: string;
    month: string;
    totalKg: number;
    capCount: number;
    castrations: number;
    remainingKg: number;
    status: string;
    outcomeSummary: string | null;
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

describe('admin monthly reports', () => {
    it('requires a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/monthly-reports')).statusCode).toBe(
            401,
        );
    });

    it('creates a draft with computed caps, full neutering and what is missing for the next', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const response = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-09',
            totalKg: 1500,
            outcomeSummary: '8 castrações e ração para 20 dias',
        });

        expect(response.statusCode).toBe(201);
        expect(response.json<ReportBody>()).toMatchObject({
            month: '2026-09',
            status: 'DRAFT',
            capCount: 600_000,
            castrations: 8,
            remainingKg: 75,
        });
    });

    it('derives the cost of a neutering in kg from the price settings', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        await app.prisma.siteSettings.upsert({
            where: { id: 1 },
            create: { id: 1, kgPriceBrl: 2, spayCostBrl: 200 },
            update: { kgPriceBrl: 2, spayCostBrl: 200 },
        });

        const response = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-09',
            totalKg: 128,
        });

        expect(response.json<ReportBody>()).toMatchObject({ castrations: 1, remainingKg: 72 });
    });

    it('rejects a duplicate month, a bad month format and a negative weight', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-09',
            totalKg: 1,
        });

        const duplicate = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-09',
            totalKg: 2,
        });
        const badMonth = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-13',
            totalKg: 2,
        });
        const negative = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-10',
            totalKg: -5,
        });

        expect([duplicate.statusCode, badMonth.statusCode, negative.statusCode]).toEqual([
            409, 400, 400,
        ]);
    });

    it('edits the weight and summary', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const created = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-09',
            totalKg: 10,
        });

        const response = await call(
            app,
            cookie,
            'PATCH',
            `/api/v1/admin/monthly-reports/${created.json<ReportBody>().id}`,
            { totalKg: 20.5, outcomeSummary: 'Vacinas' },
        );

        expect(response.json<ReportBody>()).toMatchObject({
            totalKg: 20.5,
            outcomeSummary: 'Vacinas',
        });
    });
});

describe('public monthly reports', () => {
    it('shows only published reports, newest first, and hides them again when unpublished', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const ids: string[] = [];
        for (const month of ['2026-07', '2026-08', '2026-09']) {
            const created = await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
                month,
                totalKg: 100,
            });
            ids.push(created.json<ReportBody>().id);
        }
        await call(app, cookie, 'POST', `/api/v1/admin/monthly-reports/${ids[0]}/publish`);
        await call(app, cookie, 'POST', `/api/v1/admin/monthly-reports/${ids[1]}/publish`);

        const list = await app.inject('/api/v1/monthly-reports');
        const latest = await app.inject('/api/v1/monthly-reports/latest');

        expect(list.json<{ items: ReportBody[] }>().items.map((item) => item.month)).toEqual([
            '2026-08',
            '2026-07',
        ]);
        expect(latest.json<ReportBody>().month).toBe('2026-08');
        expect(list.body).not.toContain('DRAFT');

        await call(app, cookie, 'POST', `/api/v1/admin/monthly-reports/${ids[1]}/unpublish`);
        const afterUnpublish = await app.inject('/api/v1/monthly-reports/latest');
        expect(afterUnpublish.json<ReportBody>().month).toBe('2026-07');
    });

    it('answers 404 for latest when nothing is published', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        await call(app, cookie, 'POST', '/api/v1/admin/monthly-reports', {
            month: '2026-09',
            totalKg: 1,
        });

        const response = await app.inject('/api/v1/monthly-reports/latest');

        expect(response.statusCode).toBe(404);
    });
});
