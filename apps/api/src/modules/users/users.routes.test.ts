import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import {
    DEFAULT_PASSWORD,
    call,
    createAndLogin,
    createUser,
    login,
    resetDatabase,
} from '../../../test/helpers/kit';

interface UserBody {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
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

describe('permissions on /admin/users', () => {
    it('returns 401 without a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/users')).statusCode).toBe(401);
    });

    it('returns 403 for an EDITOR on every user route', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const other = await createUser(app);

        const responses = await Promise.all([
            call(app, cookie, 'GET', '/api/v1/admin/users'),
            call(app, cookie, 'GET', `/api/v1/admin/users/${other.id}`),
            call(app, cookie, 'POST', '/api/v1/admin/users', {
                name: 'X',
                email: 'x@example.com',
                password: DEFAULT_PASSWORD,
            }),
            call(app, cookie, 'PATCH', `/api/v1/admin/users/${other.id}`, { role: 'ADMIN' }),
            call(app, cookie, 'DELETE', `/api/v1/admin/users/${other.id}`),
        ]);

        expect(responses.map((response) => response.statusCode)).toEqual([403, 403, 403, 403, 403]);
    });
});

describe('admin user management', () => {
    it('lists users with pagination and never exposes password hashes', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        await createUser(app);
        await createUser(app);

        const response = await call(app, cookie, 'GET', '/api/v1/admin/users?pageSize=2');

        const body = response.json<{
            items: UserBody[];
            meta: { total: number; totalPages: number };
        }>();
        expect(response.statusCode).toBe(200);
        expect(body.items).toHaveLength(2);
        expect(body.meta).toMatchObject({ total: 3, totalPages: 2 });
        expect(response.body).not.toMatch(/password/i);
    });

    it('creates a user with a hashed password who can log in', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');

        const response = await call(app, cookie, 'POST', '/api/v1/admin/users', {
            name: 'Bia',
            email: 'Bia@Example.com',
            password: 'another-good-password',
        });

        expect(response.statusCode).toBe(201);
        expect(response.json<UserBody>()).toMatchObject({
            email: 'bia@example.com',
            role: 'EDITOR',
        });
        const stored = await app.prisma.user.findUniqueOrThrow({
            where: { email: 'bia@example.com' },
        });
        expect(stored.passwordHash).not.toContain('another-good-password');
        await expect(login(app, 'bia@example.com', 'another-good-password')).resolves.toContain(
            '=',
        );
    });

    it('rejects a duplicate e-mail, a short password and unknown fields', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        const existing = await createUser(app, { email: 'dup@example.com' });
        const base = { name: 'X', email: 'new@example.com', password: DEFAULT_PASSWORD };

        const duplicate = await call(app, cookie, 'POST', '/api/v1/admin/users', {
            ...base,
            email: existing.email,
        });
        const weak = await call(app, cookie, 'POST', '/api/v1/admin/users', {
            ...base,
            password: 'short',
        });
        const extra = await call(app, cookie, 'POST', '/api/v1/admin/users', {
            ...base,
            isAdmin: true,
        });

        expect(duplicate.statusCode).toBe(409);
        expect(weak.statusCode).toBe(400);
        expect(extra.statusCode).toBe(400);
    });

    it('updates role and name, and returns 404 for an unknown user', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        const target = await createUser(app);

        const updated = await call(app, cookie, 'PATCH', `/api/v1/admin/users/${target.id}`, {
            name: 'Renamed',
            role: 'ADMIN',
        });
        const missing = await call(
            app,
            cookie,
            'PATCH',
            '/api/v1/admin/users/019a0000-0000-7000-8000-000000000000',
            { name: 'x' },
        );

        expect(updated.statusCode).toBe(200);
        expect(updated.json<UserBody & { name: string }>()).toMatchObject({
            name: 'Renamed',
            role: 'ADMIN',
        });
        expect(missing.statusCode).toBe(404);
    });

    it('ends the sessions of a user who is deactivated or gets a new password', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        const target = await createUser(app, { email: 'target@example.com' });
        const targetCookie = await login(app, target.email);

        await call(app, cookie, 'PATCH', `/api/v1/admin/users/${target.id}`, { isActive: false });

        expect((await call(app, targetCookie, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
        expect(await app.prisma.session.count({ where: { userId: target.id } })).toBe(0);
    });

    it('does not let an administrator demote, deactivate or delete themselves', async () => {
        const { cookie, userId } = await createAndLogin(app, 'ADMIN');

        const demote = await call(app, cookie, 'PATCH', `/api/v1/admin/users/${userId}`, {
            role: 'EDITOR',
        });
        const deactivate = await call(app, cookie, 'PATCH', `/api/v1/admin/users/${userId}`, {
            isActive: false,
        });
        const remove = await call(app, cookie, 'DELETE', `/api/v1/admin/users/${userId}`);

        expect([demote.statusCode, deactivate.statusCode, remove.statusCode]).toEqual([
            409, 409, 409,
        ]);
    });

    it('deletes another user', async () => {
        const { cookie } = await createAndLogin(app, 'ADMIN');
        const target = await createUser(app);

        const response = await call(app, cookie, 'DELETE', `/api/v1/admin/users/${target.id}`);

        expect(response.statusCode).toBe(204);
        expect(await app.prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    });
});
