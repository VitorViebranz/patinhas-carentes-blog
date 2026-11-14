import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, createNeighborhood, resetDatabase } from '../../../test/helpers/kit';
import { brazilToday, dateOnly } from '../../lib/periods';

interface PickupBody {
    id: string;
    pointId: string;
    pointName: string;
    pickedUpOn: string;
    kg: number;
}

interface LeaderboardBody {
    period: string;
    totalKg: number;
    pickups: number;
    pointCount: number;
    capCount: number;
    castrations: number;
    items: {
        rank: number;
        pointId: string;
        name: string;
        totalKg: number;
        pickups: number;
        lastPickupOn: string | null;
    }[];
}

interface PointImpactBody {
    point: { id: string; name: string };
    totalKg: number;
    pickups: number;
    firstPickupOn: string | null;
    lastPickupOn: string | null;
    castrations: number;
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

async function createPoint(name: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') {
    const neighborhood = await createNeighborhood(app);
    return app.prisma.collectionPoint.create({
        data: {
            name,
            neighborhoodId: neighborhood.id,
            category: 'EDUCATION',
            latitude: -26.3,
            longitude: -48.85,
            locationPrecision: 'HOUSE_NUMBER',
            status,
        },
    });
}

function daysAgo(days: number): string {
    const date = dateOnly(brazilToday(new Date()));
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
}

describe('admin pickups', () => {
    it('requires a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/pickups')).statusCode).toBe(401);
        expect(
            (
                await call(app, null, 'POST', '/api/v1/admin/pickups', {
                    pointId: '019a0000-0000-7000-8000-000000000000',
                    kg: 1,
                })
            ).statusCode,
        ).toBe(401);
    });

    it('registers a pickup for today when the date is left out', async () => {
        const { cookie, userId } = await createAndLogin(app, 'EDITOR');
        const point = await createPoint('Escola Sol');

        const response = await call(app, cookie, 'POST', '/api/v1/admin/pickups', {
            pointId: point.id,
            kg: 12.5,
        });

        expect(response.statusCode).toBe(201);
        expect(response.json<PickupBody>()).toMatchObject({
            pointId: point.id,
            pointName: 'Escola Sol',
            pickedUpOn: brazilToday(new Date()),
            kg: 12.5,
        });
        expect((await app.prisma.pickup.findFirstOrThrow()).createdById).toBe(userId);
    });

    it('rejects a future date, a zero weight, a fake date and an unknown point', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const point = await createPoint('Escola Sol');
        const post = (body: object) => call(app, cookie, 'POST', '/api/v1/admin/pickups', body);

        expect((await post({ pointId: point.id, kg: 5, pickedUpOn: daysAgo(-2) })).statusCode).toBe(
            400,
        );
        expect((await post({ pointId: point.id, kg: 0 })).statusCode).toBe(400);
        expect(
            (await post({ pointId: point.id, kg: 5, pickedUpOn: '2026-02-30' })).statusCode,
        ).toBe(400);
        expect(
            (await post({ pointId: '019a0000-0000-7000-8000-000000000000', kg: 5 })).statusCode,
        ).toBe(404);
        expect(await app.prisma.pickup.count()).toBe(0);
    });

    it('does not register a pickup for a point taken off the site', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const point = await createPoint('Escola antiga', 'INACTIVE');

        const response = await call(app, cookie, 'POST', '/api/v1/admin/pickups', {
            pointId: point.id,
            kg: 5,
        });

        expect(response.statusCode).toBe(404);
    });

    it('lists the newest first, filters by point and deletes a wrong entry', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const sun = await createPoint('Escola Sol');
        const moon = await createPoint('Loja Lua');
        const post = (pointId: string, kg: number, pickedUpOn: string) =>
            call(app, cookie, 'POST', '/api/v1/admin/pickups', { pointId, kg, pickedUpOn });
        await post(sun.id, 10, daysAgo(10));
        const wrong = (await post(sun.id, 99, daysAgo(2))).json<PickupBody>();
        await post(moon.id, 7, daysAgo(5));

        const all = await call(app, cookie, 'GET', '/api/v1/admin/pickups');
        const onlySun = await call(app, cookie, 'GET', `/api/v1/admin/pickups?pointId=${sun.id}`);

        expect(all.json<{ items: PickupBody[] }>().items.map((item) => item.kg)).toEqual([
            99, 7, 10,
        ]);
        expect(onlySun.json<{ items: PickupBody[] }>().items).toHaveLength(2);

        const removed = await call(app, cookie, 'DELETE', `/api/v1/admin/pickups/${wrong.id}`);
        const missing = await call(app, cookie, 'DELETE', `/api/v1/admin/pickups/${wrong.id}`);

        expect(removed.statusCode).toBe(204);
        expect(missing.statusCode).toBe(404);
    });

    it('refuses a weight above the limit', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const point = await createPoint('Escola Sol');
        const post = (kg: number) =>
            call(app, cookie, 'POST', '/api/v1/admin/pickups', { pointId: point.id, kg });

        expect((await post(5001)).statusCode).toBe(400);
        expect((await post(5000)).statusCode).toBe(201);
    });

    it('lets an editor undo their own recent entry, but not an old one or someone else’s', async () => {
        const first = await createAndLogin(app, 'EDITOR');
        const second = await createAndLogin(app, 'EDITOR');
        const admin = await createAndLogin(app, 'ADMIN');
        const point = await createPoint('Escola Sol');
        const make = (createdById: string, hoursAgo: number) =>
            app.prisma.pickup.create({
                data: {
                    pointId: point.id,
                    kg: 10,
                    pickedUpOn: dateOnly(daysAgo(0)),
                    createdById,
                    createdAt: new Date(Date.now() - hoursAgo * 3_600_000),
                },
            });
        const remove = (cookie: string, id: string) =>
            call(app, cookie, 'DELETE', `/api/v1/admin/pickups/${id}`);

        const recent = await make(first.userId, 1);
        const old = await make(first.userId, 48);
        const others = await make(second.userId, 1);

        expect((await remove(first.cookie, others.id)).statusCode).toBe(403);
        expect((await remove(first.cookie, old.id)).statusCode).toBe(403);
        expect((await remove(first.cookie, recent.id)).statusCode).toBe(204);
        expect((await remove(admin.cookie, old.id)).statusCode).toBe(204);
        expect(await app.prisma.pickup.count()).toBe(1);
    });

    it('summarises the last pickup and total of each point', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const sun = await createPoint('Escola Sol');
        await createPoint('Sem retirada');
        const post = (kg: number, pickedUpOn: string) =>
            call(app, cookie, 'POST', '/api/v1/admin/pickups', {
                pointId: sun.id,
                kg,
                pickedUpOn,
            });
        await post(10, daysAgo(30));
        await post(5.5, daysAgo(3));

        const response = await call(app, cookie, 'GET', '/api/v1/admin/pickups/summary');

        expect(response.json()).toEqual({
            items: [{ pointId: sun.id, totalKg: 15.5, pickups: 2, lastPickupOn: daysAgo(3) }],
        });
    });
});

describe('GET /leaderboard (public)', () => {
    async function seedPickups() {
        const sun = await createPoint('Escola Sol');
        const moon = await createPoint('Loja Lua');
        const old = await createPoint('Escola antiga', 'INACTIVE');
        await app.prisma.pickup.createMany({
            data: [
                { pointId: sun.id, kg: 40, pickedUpOn: dateOnly(daysAgo(0)) },
                { pointId: sun.id, kg: 10, pickedUpOn: dateOnly(daysAgo(0)) },
                { pointId: moon.id, kg: 60, pickedUpOn: dateOnly(daysAgo(0)) },
                { pointId: sun.id, kg: 100, pickedUpOn: dateOnly('2020-01-15') },
                { pointId: old.id, kg: 500, pickedUpOn: dateOnly(daysAgo(0)) },
            ],
        });
        return { sun, moon };
    }

    it('ranks the active points of the year and ignores inactive ones', async () => {
        const { sun, moon } = await seedPickups();

        const response = await app.inject('/api/v1/leaderboard?period=year');
        const body = response.json<LeaderboardBody>();

        expect(response.statusCode).toBe(200);
        expect(response.headers['etag']).toBeDefined();
        expect(body.items.map((item) => [item.rank, item.pointId, item.totalKg])).toEqual([
            [1, moon.id, 60],
            [2, sun.id, 50],
        ]);
        expect(body).toMatchObject({ totalKg: 110, pickups: 3, pointCount: 2 });
    });

    it('counts every pickup when the period is all time', async () => {
        const { sun } = await seedPickups();

        const body = (await app.inject('/api/v1/leaderboard?period=all')).json<LeaderboardBody>();

        const sunEntry = body.items.find((item) => item.pointId === sun.id);
        expect(sunEntry).toMatchObject({ totalKg: 150, pickups: 3 });
        expect(body.totalKg).toBe(210);
    });

    it('is empty, not an error, when nothing was collected yet', async () => {
        const response = await app.inject('/api/v1/leaderboard');

        expect(response.statusCode).toBe(200);
        expect(response.json<LeaderboardBody>()).toMatchObject({
            period: 'month',
            totalKg: 0,
            pointCount: 0,
            items: [],
        });
    });

    it('rejects an unknown period', async () => {
        expect((await app.inject('/api/v1/leaderboard?period=week')).statusCode).toBe(400);
    });
});

describe('GET /leaderboard/points/:id (public)', () => {
    it('totals a point across all time for the certificate', async () => {
        const sun = await createPoint('Escola Sol');
        await app.prisma.pickup.createMany({
            data: [
                { pointId: sun.id, kg: 100, pickedUpOn: dateOnly('2025-03-10') },
                { pointId: sun.id, kg: 75.5, pickedUpOn: dateOnly(daysAgo(4)) },
            ],
        });

        const response = await app.inject(`/api/v1/leaderboard/points/${sun.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.json<PointImpactBody>()).toMatchObject({
            point: { id: sun.id, name: 'Escola Sol' },
            totalKg: 175.5,
            pickups: 2,
            firstPickupOn: '2025-03-10',
            lastPickupOn: daysAgo(4),
            castrations: 1,
        });
    });

    it('answers a point with no pickup yet with zeros', async () => {
        const sun = await createPoint('Escola Sol');

        const body = (
            await app.inject(`/api/v1/leaderboard/points/${sun.id}`)
        ).json<PointImpactBody>();

        expect(body).toMatchObject({ totalKg: 0, pickups: 0, firstPickupOn: null });
    });

    it('is not found for an unknown or inactive point', async () => {
        const old = await createPoint('Escola antiga', 'INACTIVE');

        expect(
            (await app.inject('/api/v1/leaderboard/points/019a0000-0000-7000-8000-000000000000'))
                .statusCode,
        ).toBe(404);
        expect((await app.inject(`/api/v1/leaderboard/points/${old.id}`)).statusCode).toBe(404);
    });
});
