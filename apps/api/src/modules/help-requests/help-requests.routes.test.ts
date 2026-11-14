import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, resetDatabase } from '../../../test/helpers/kit';

interface RequestBody {
    id: string;
    status: string;
    answeredAt: string | null;
    contact: string;
}

const valid = {
    type: 'COLLECTION_POINT',
    requesterName: 'Maria Souza',
    contact: '(47) 99999-0000',
    institutionName: 'Papelaria Central',
    institutionType: 'STORE',
    consent: true,
};

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

function submit(payload: Record<string, unknown>) {
    return app.inject({ method: 'POST', url: '/api/v1/help-requests', payload });
}

describe('POST /help-requests (public)', () => {
    it('saves a valid request as NEW with the consent timestamp, and returns no personal data', async () => {
        const response = await submit(valid);

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual({ status: 'received' });
        const stored = await app.prisma.helpRequest.findFirstOrThrow();
        expect(stored).toMatchObject({
            status: 'NEW',
            type: 'COLLECTION_POINT',
            requesterName: 'Maria Souza',
            institutionType: 'STORE',
        });
        expect(stored.consentGivenAt).toBeInstanceOf(Date);
    });

    it('stores the address of a collection point request', async () => {
        const response = await submit({
            ...valid,
            postalCode: '89223-005',
            address: 'Rua das Flores, 120',
            neighborhoodName: 'Bom Retiro',
        });

        expect(response.statusCode).toBe(201);
        const stored = await app.prisma.helpRequest.findFirstOrThrow();
        expect(stored).toMatchObject({
            postalCode: '89223-005',
            address: 'Rua das Flores, 120',
            neighborhoodName: 'Bom Retiro',
        });
        const bad = await submit({ ...valid, postalCode: '123' });
        expect(bad.statusCode).toBe(400);
    });

    it('accepts an e-mail as contact and a foster request without institution', async () => {
        const response = await submit({
            type: 'FOSTER',
            requesterName: 'Beatriz',
            contact: 'bia@example.com',
            animalCapacity: 2,
            consent: true,
        });

        expect(response.statusCode).toBe(201);
    });

    it('requires explicit consent', async () => {
        const missing = await submit({ ...valid, consent: undefined });
        const refused = await submit({ ...valid, consent: false });

        expect(missing.statusCode).toBe(400);
        expect(refused.statusCode).toBe(400);
        expect(await app.prisma.helpRequest.count()).toBe(0);
    });

    it('requires the institution name for collection point and talk requests', async () => {
        const response = await submit({ ...valid, institutionName: undefined });

        expect(response.statusCode).toBe(400);
        expect(
            response.json<{ error: { details: { path: string }[] } }>().error.details[0]?.path,
        ).toBe('institutionName');
    });

    it('rejects an invalid contact, unknown fields and an unknown type', async () => {
        const badContact = await submit({ ...valid, contact: 'abc' });
        const extra = await submit({ ...valid, status: 'ANSWERED' });
        const badType = await submit({ ...valid, type: 'HACK' });

        expect([badContact.statusCode, extra.statusCode, badType.statusCode]).toEqual([
            400, 400, 400,
        ]);
    });

    it('pretends to accept a bot that fills the honeypot, but saves nothing', async () => {
        const response = await submit({ ...valid, website: 'http://spam.example' });

        expect(response.statusCode).toBe(201);
        expect(await app.prisma.helpRequest.count()).toBe(0);
    });

    it('is rate limited per IP', async () => {
        const limited = await buildTestApp({ HELP_REQUEST_RATE_LIMIT_MAX: '2' });
        await limited.ready();
        try {
            const statuses: number[] = [];
            for (let i = 0; i < 3; i += 1) {
                const response = await limited.inject({
                    method: 'POST',
                    url: '/api/v1/help-requests',
                    payload: valid,
                });
                statuses.push(response.statusCode);
            }

            expect(statuses).toEqual([201, 201, 429]);
        } finally {
            await limited.close();
        }
    });
});

describe('admin help requests', () => {
    it('requires a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/help-requests')).statusCode).toBe(401);
    });

    it('lists newest first and filters by status', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        await submit(valid);
        await submit({ ...valid, requesterName: 'Segunda Pessoa' });
        const first = await app.prisma.helpRequest.findFirstOrThrow({
            orderBy: { createdAt: 'asc' },
        });
        await app.prisma.helpRequest.update({
            where: { id: first.id },
            data: { status: 'ANSWERED' },
        });

        const all = await call(app, cookie, 'GET', '/api/v1/admin/help-requests');
        const onlyNew = await call(app, cookie, 'GET', '/api/v1/admin/help-requests?status=NEW');

        expect(all.json<{ items: unknown[] }>().items).toHaveLength(2);
        const newItems = onlyNew.json<{ items: RequestBody[] }>().items;
        expect(newItems).toHaveLength(1);
        expect(newItems[0]?.status).toBe('NEW');
    });

    it('marks a request as answered by the current user, and back to new', async () => {
        const { cookie, userId } = await createAndLogin(app, 'EDITOR');
        await submit(valid);
        const stored = await app.prisma.helpRequest.findFirstOrThrow();

        const answered = await call(
            app,
            cookie,
            'PATCH',
            `/api/v1/admin/help-requests/${stored.id}`,
            {
                status: 'ANSWERED',
            },
        );

        expect(answered.json<RequestBody>()).toMatchObject({ status: 'ANSWERED' });
        expect(answered.json<RequestBody>().answeredAt).not.toBeNull();
        expect((await app.prisma.helpRequest.findFirstOrThrow()).answeredById).toBe(userId);

        const reopened = await call(
            app,
            cookie,
            'PATCH',
            `/api/v1/admin/help-requests/${stored.id}`,
            {
                status: 'NEW',
            },
        );
        expect(reopened.json<RequestBody>().answeredAt).toBeNull();
    });

    it('lets only an ADMIN delete a request (LGPD erasure)', async () => {
        const editor = await createAndLogin(app, 'EDITOR');
        const admin = await createAndLogin(app, 'ADMIN');
        await submit(valid);
        const stored = await app.prisma.helpRequest.findFirstOrThrow();

        const denied = await call(
            app,
            editor.cookie,
            'DELETE',
            `/api/v1/admin/help-requests/${stored.id}`,
        );
        const allowed = await call(
            app,
            admin.cookie,
            'DELETE',
            `/api/v1/admin/help-requests/${stored.id}`,
        );

        expect(denied.statusCode).toBe(403);
        expect(allowed.statusCode).toBe(204);
        expect(await app.prisma.helpRequest.count()).toBe(0);
    });
});
