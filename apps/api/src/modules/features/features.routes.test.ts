import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, createNeighborhood, resetDatabase } from '../../../test/helpers/kit';

interface ToggleBody {
    key: string;
    visible: boolean;
    hiddenFeatures: string[];
}

interface SettingsBody {
    hiddenFeatures: string[];
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

const toggle = (cookie: string | null, key: string, visible: boolean) =>
    call(app, cookie, 'PUT', `/api/v1/admin/features/${key}`, { visible });

const hiddenNow = async () =>
    (await app.inject('/api/v1/site-settings')).json<SettingsBody>().hiddenFeatures;

describe('PUT /admin/features/:key', () => {
    it('requires a session and an administrator', async () => {
        const editor = await createAndLogin(app, 'EDITOR');

        expect((await toggle(null, 'page.leaderboard', false)).statusCode).toBe(401);
        expect((await toggle(editor.cookie, 'page.leaderboard', false)).statusCode).toBe(403);
        expect(await hiddenNow()).toEqual([]);
    });

    it('answers 401, not a validation error, to someone who is not logged in', async () => {
        const response = await call(app, null, 'PUT', '/api/v1/admin/features/page.help', {
            visible: 'not a boolean',
        });

        expect(response.statusCode).toBe(401);
    });

    it('turns an item off and on, and the public settings follow', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');

        const off = await toggle(cookie, 'page.leaderboard', false);
        expect(off.statusCode).toBe(200);
        expect(off.json<ToggleBody>()).toEqual({
            key: 'page.leaderboard',
            visible: false,
            hiddenFeatures: ['page.leaderboard'],
        });
        expect(await hiddenNow()).toEqual(['page.leaderboard']);

        const on = await toggle(cookie, 'page.leaderboard', true);
        expect(on.json<ToggleBody>().hiddenFeatures).toEqual([]);
        expect(await hiddenNow()).toEqual([]);
    });

    it('does not repeat a key when it is turned off twice', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');

        await toggle(cookie, 'home.points', false);
        await toggle(cookie, 'home.points', false);

        expect(await hiddenNow()).toEqual(['home.points']);
    });

    it('keeps the other items when one is turned back on', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await toggle(cookie, 'home.points', false);
        await toggle(cookie, 'home.about', false);

        await toggle(cookie, 'home.points', true);

        expect(await hiddenNow()).toEqual(['home.about']);
    });

    it('turning on something that was never off changes nothing', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');

        const response = await toggle(cookie, 'page.help', true);

        expect(response.statusCode).toBe(200);
        expect(response.json<ToggleBody>().hiddenFeatures).toEqual([]);
    });

    it('rejects an unknown key and a body that is not a yes or no', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');

        expect((await toggle(cookie, 'page.nope', false)).statusCode).toBe(400);
        expect(
            (
                await call(app, cookie, 'PUT', '/api/v1/admin/features/page.help', {
                    visible: 'no',
                })
            ).statusCode,
        ).toBe(400);
        expect(await hiddenNow()).toEqual([]);
    });

    it('shows the list to the admin panel too', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await toggle(cookie, 'global.whatsapp', false);

        const response = await call(app, cookie, 'GET', '/api/v1/admin/site-settings');

        expect(response.json<SettingsBody>().hiddenFeatures).toEqual(['global.whatsapp']);
    });
});

describe('what the public can reach when something is off', () => {
    it('closes the placar data but not the admin side of it', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await toggle(cookie, 'page.leaderboard', false);

        expect((await app.inject('/api/v1/leaderboard')).statusCode).toBe(404);
        expect(
            (await app.inject('/api/v1/leaderboard/points/019a0000-0000-7000-8000-000000000000'))
                .statusCode,
        ).toBe(404);
        expect((await call(app, cookie, 'GET', '/api/v1/admin/pickups')).statusCode).toBe(200);

        await toggle(cookie, 'page.leaderboard', true);
        expect((await app.inject('/api/v1/leaderboard')).statusCode).toBe(200);
    });

    it('closes the stories and keeps the admin able to write them', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await toggle(cookie, 'page.stories', false);

        expect((await app.inject('/api/v1/stories')).statusCode).toBe(404);
        expect((await app.inject('/api/v1/stories/qualquer')).statusCode).toBe(404);
        expect((await call(app, cookie, 'GET', '/api/v1/admin/stories')).statusCode).toBe(200);
    });

    it('closes the monthly reports', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await toggle(cookie, 'page.report', false);

        expect((await app.inject('/api/v1/monthly-reports')).statusCode).toBe(404);
        expect((await app.inject('/api/v1/monthly-reports/latest')).statusCode).toBe(404);
        expect((await call(app, cookie, 'GET', '/api/v1/admin/monthly-reports')).statusCode).toBe(
            200,
        );
    });

    it('closes the list of collection points when the map section is off', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await createNeighborhood(app);
        await toggle(cookie, 'home.points', false);

        expect((await app.inject('/api/v1/collection-points')).statusCode).toBe(404);
        expect((await call(app, cookie, 'GET', '/api/v1/admin/collection-points')).statusCode).toBe(
            200,
        );
    });

    it('stops each kind of help request only when its own page is off', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        const send = (body: object) =>
            call(app, null, 'POST', '/api/v1/help-requests', {
                requesterName: 'Maria Souza',
                contact: '47999990000',
                consent: true,
                ...body,
            });
        await toggle(cookie, 'page.school', false);

        expect(
            (
                await send({
                    type: 'COLLECTION_POINT',
                    institutionName: 'Papelaria Central',
                    institutionType: 'STORE',
                })
            ).statusCode,
        ).toBe(404);
        expect((await send({ type: 'FOSTER', animalCapacity: 1 })).statusCode).toBe(201);

        await toggle(cookie, 'page.school', true);
        await toggle(cookie, 'page.help', false);

        expect((await send({ type: 'FOSTER', animalCapacity: 1 })).statusCode).toBe(404);
        expect(
            (
                await send({
                    type: 'COLLECTION_POINT',
                    institutionName: 'Papelaria Central',
                    institutionType: 'STORE',
                })
            ).statusCode,
        ).toBe(201);
        expect(await app.prisma.helpRequest.count()).toBe(2);
    });
});
