import { randomBytes, scryptSync } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ORIGIN, buildTestApp } from '../../../test/helpers/build-test-app';
import {
    DEFAULT_PASSWORD,
    call,
    createUser,
    login,
    resetDatabase,
} from '../../../test/helpers/kit';

interface ErrorBody {
    error: { code: string; message: string };
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

function loginRequest(email: string, password: string, origin: string | null = ORIGIN) {
    return app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: origin ? { origin } : {},
        payload: { email, password },
    });
}

describe('POST /auth/login', () => {
    it('logs in and sets a hardened session cookie', async () => {
        const user = await createUser(app, { email: 'ana@example.com', role: 'ADMIN' });

        const response = await loginRequest('ana@example.com', DEFAULT_PASSWORD);

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            user: { id: user.id, name: user.name, email: 'ana@example.com', role: 'ADMIN' },
        });
        const header = String(response.headers['set-cookie']);
        expect(header).toMatch(/HttpOnly/i);
        expect(header).toMatch(/SameSite=Lax/i);
        expect(header).toMatch(/Expires=/i);
        expect(response.body).not.toContain('passwordHash');
    });

    it('accepts the e-mail in any case and records the last login', async () => {
        const user = await createUser(app, { email: 'ana@example.com' });

        const response = await loginRequest('  ANA@Example.com ', DEFAULT_PASSWORD);

        expect(response.statusCode).toBe(200);
        const updated = await app.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        expect(updated.lastLoginAt).not.toBeNull();
    });

    it('stores only a hash of the session token', async () => {
        await createUser(app, { email: 'ana@example.com' });

        const response = await loginRequest('ana@example.com', DEFAULT_PASSWORD);

        const token = response.cookies[0]?.value ?? '';
        const sessions = await app.prisma.session.findMany();
        expect(sessions).toHaveLength(1);
        expect(sessions[0]?.tokenHash).not.toBe(token);
        expect(sessions[0]?.tokenHash).not.toContain(token);
    });

    it('gives the same generic error for a wrong password, an unknown e-mail and an inactive user', async () => {
        await createUser(app, { email: 'ana@example.com' });
        await createUser(app, { email: 'off@example.com', isActive: false });

        const responses = await Promise.all([
            loginRequest('ana@example.com', 'wrong-password-1'),
            loginRequest('nobody@example.com', DEFAULT_PASSWORD),
            loginRequest('off@example.com', DEFAULT_PASSWORD),
        ]);

        for (const response of responses) {
            expect(response.statusCode).toBe(401);
            expect(response.json<ErrorBody>().error.message).toBe('Invalid e-mail or password');
            expect(response.cookies).toHaveLength(0);
        }
    });

    it('rejects unknown fields and malformed e-mails', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { origin: ORIGIN },
            payload: { email: 'not-an-email', password: 'x', admin: true },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json<ErrorBody>().error.code).toBe('VALIDATION_ERROR');
    });

    it('rotates the session: logging in again invalidates the cookie that was sent', async () => {
        await createUser(app, { email: 'ana@example.com' });
        const oldCookie = await login(app, 'ana@example.com');

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { origin: ORIGIN, cookie: oldCookie },
            payload: { email: 'ana@example.com', password: DEFAULT_PASSWORD },
        });

        expect(response.statusCode).toBe(200);
        expect((await call(app, oldCookie, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    });

    it('limits attempts per e-mail', async () => {
        const limited = await buildTestApp({ AUTH_RATE_LIMIT_MAX: '3' });
        await limited.ready();
        try {
            await createUser(limited, { email: 'ana@example.com' });
            const statuses: number[] = [];
            for (let i = 0; i < 5; i += 1) {
                const response = await limited.inject({
                    method: 'POST',
                    url: '/api/v1/auth/login',
                    headers: { origin: ORIGIN },
                    payload: { email: 'ana@example.com', password: 'wrong-password-1' },
                });
                statuses.push(response.statusCode);
            }

            expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
            expect(statuses.slice(3)).toEqual([429, 429]);
        } finally {
            await limited.close();
        }
    });
});

describe('password cost upgrade', () => {
    it('rehashes an old weaker hash at the next login and keeps the password working', async () => {
        const user = await createUser(app, { email: 'ana@example.com' });
        const salt = randomBytes(16);
        const key = scryptSync(DEFAULT_PASSWORD, salt, 64, { N: 1024, r: 8, p: 1 });
        const weak = ['scrypt', 1024, 8, 1, salt.toString('base64url'), key.toString('base64url')];
        await app.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: weak.join('$') },
        });

        const first = await loginRequest('ana@example.com', DEFAULT_PASSWORD);
        const stored = (await app.prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
            .passwordHash;
        const again = await loginRequest('ana@example.com', DEFAULT_PASSWORD);

        expect(first.statusCode).toBe(200);
        expect(stored.split('$')[1]).not.toBe('1024');
        expect(again.statusCode).toBe(200);
    });
});

describe('login lockout', () => {
    it('does not lock the real owner out because someone else keeps guessing', async () => {
        const limited = await buildTestApp({ AUTH_RATE_LIMIT_MAX: '3' });
        await limited.ready();
        try {
            await createUser(limited, { email: 'ana@example.com' });
            const attempt = (remoteAddress: string, password: string) =>
                limited.inject({
                    method: 'POST',
                    url: '/api/v1/auth/login',
                    remoteAddress,
                    headers: { origin: ORIGIN },
                    payload: { email: 'ana@example.com', password },
                });

            for (let i = 0; i < 4; i += 1) await attempt('203.0.113.9', 'wrong-password-1');
            const attacker = await attempt('203.0.113.9', 'wrong-password-1');
            const owner = await attempt('198.51.100.7', DEFAULT_PASSWORD);

            expect(attacker.statusCode).toBe(429);
            expect(owner.statusCode).toBe(200);
        } finally {
            await limited.close();
        }
    });
});

describe('CSRF protection', () => {
    it('cannot be skipped by writing part of the path as percent codes', async () => {
        const encodedAuth = await app.inject({
            method: 'POST',
            url: '/api/v1/%61uth/login',
            payload: { email: 'a@example.com', password: DEFAULT_PASSWORD },
        });
        const encodedAdmin = await app.inject({
            method: 'PUT',
            url: '/api/v1/%61dmin/features/page.help',
            payload: { visible: false },
        });

        expect(encodedAuth.statusCode).toBe(403);
        expect(encodedAdmin.statusCode).toBe(403);
    });

    it('keeps the public form open without an Origin header', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/help-requests',
            payload: {
                type: 'FOSTER',
                requesterName: 'Maria Souza',
                contact: '47999990000',
                animalCapacity: 1,
                consent: true,
            },
        });

        expect(response.statusCode).toBe(201);
    });

    it('rejects writes without an Origin header', async () => {
        const response = await loginRequest('a@example.com', DEFAULT_PASSWORD, null);

        expect(response.statusCode).toBe(403);
        expect(response.json<ErrorBody>().error.code).toBe('FORBIDDEN');
    });

    it('rejects writes from another origin', async () => {
        const response = await loginRequest(
            'a@example.com',
            DEFAULT_PASSWORD,
            'https://evil.example',
        );

        expect(response.statusCode).toBe(403);
    });

    it('applies to admin routes too, even with a valid session', async () => {
        const user = await createUser(app, { role: 'ADMIN' });
        const cookie = await login(app, user.email);

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/monthly-reports',
            headers: { cookie, origin: 'https://evil.example' },
            payload: { month: '2026-09', totalKg: 10 },
        });

        expect(response.statusCode).toBe(403);
    });

    it('does not require an Origin for reads', async () => {
        expect((await app.inject('/api/v1/auth/me')).statusCode).toBe(401);
    });
});

describe('GET /auth/me and POST /auth/logout', () => {
    it('returns 401 without a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    });

    it('returns the current user', async () => {
        const user = await createUser(app, { role: 'EDITOR' });
        const cookie = await login(app, user.email);

        const response = await call(app, cookie, 'GET', '/api/v1/auth/me');

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({ user: { id: user.id, role: 'EDITOR' } });
    });

    it('logout ends the session on the server', async () => {
        const user = await createUser(app);
        const cookie = await login(app, user.email);

        const out = await call(app, cookie, 'POST', '/api/v1/auth/logout');

        expect(out.statusCode).toBe(204);
        expect((await call(app, cookie, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
        expect(await app.prisma.session.count()).toBe(0);
    });

    it('rejects an expired session', async () => {
        const user = await createUser(app);
        const cookie = await login(app, user.email);
        await app.prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

        expect((await call(app, cookie, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    });

    it('rejects a session of a user who was deactivated', async () => {
        const user = await createUser(app);
        const cookie = await login(app, user.email);
        await app.prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

        expect((await call(app, cookie, 'GET', '/api/v1/auth/me')).statusCode).toBe(401);
    });

    it('rejects a made-up cookie', async () => {
        expect((await call(app, 'sid=not-a-real-token', 'GET', '/api/v1/auth/me')).statusCode).toBe(
            401,
        );
    });
});
