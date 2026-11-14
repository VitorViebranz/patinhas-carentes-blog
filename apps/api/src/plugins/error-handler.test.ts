import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildTestApp } from '../../test/helpers/build-test-app';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';

interface ErrorBody {
    error: { code: string; message: string; details?: { path?: string; message: string }[] };
}

let app: FastifyInstance | undefined;

afterEach(async () => {
    await app?.close();
    app = undefined;
});

async function appWithRoutes(overrides: Record<string, string> = {}): Promise<FastifyInstance> {
    const instance = await buildTestApp(overrides);

    instance.get('/test/not-found', async () => {
        throw new NotFoundError('Thing missing');
    });
    instance.get('/test/unauthorized', async () => {
        throw new UnauthorizedError('Login required');
    });
    instance.get('/test/conflict', async () => {
        throw new ConflictError('Already exists');
    });
    instance.get('/test/validation', async () => {
        throw new ValidationError('Bad input', [{ path: 'email', message: 'Required' }]);
    });
    instance.get('/test/boom', async () => {
        throw new Error('database password is hunter2');
    });
    instance.get('/test/ping', async () => ({ ok: true }));
    instance
        .withTypeProvider<ZodTypeProvider>()
        .post(
            '/test/validate',
            { schema: { body: z.strictObject({ name: z.string().min(2) }) } },
            async () => ({ ok: true }),
        );

    await instance.ready();
    return instance;
}

describe('central error handler', () => {
    it('turns domain errors into the standard error format', async () => {
        app = await appWithRoutes();

        const notFound = await app.inject('/test/not-found');
        const unauthorized = await app.inject('/test/unauthorized');
        const conflict = await app.inject('/test/conflict');

        expect(notFound.statusCode).toBe(404);
        expect(notFound.json<ErrorBody>().error).toEqual({
            code: 'NOT_FOUND',
            message: 'Thing missing',
        });
        expect(unauthorized.statusCode).toBe(401);
        expect(unauthorized.json<ErrorBody>().error.code).toBe('UNAUTHORIZED');
        expect(conflict.statusCode).toBe(409);
        expect(conflict.json<ErrorBody>().error.code).toBe('CONFLICT');
    });

    it('includes details from a domain validation error', async () => {
        app = await appWithRoutes();

        const response = await app.inject('/test/validation');

        expect(response.statusCode).toBe(400);
        expect(response.json<ErrorBody>().error.details).toEqual([
            { path: 'email', message: 'Required' },
        ]);
    });

    it('returns 400 with field details when the request body fails schema validation', async () => {
        app = await appWithRoutes();

        const response = await app.inject({
            method: 'POST',
            url: '/test/validate',
            payload: { name: 'a' },
        });

        const body = response.json<ErrorBody>();
        expect(response.statusCode).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.details?.some((detail) => detail.path === 'name')).toBe(true);
    });

    it('rejects unknown fields in the request body', async () => {
        app = await appWithRoutes();

        const response = await app.inject({
            method: 'POST',
            url: '/test/validate',
            payload: { name: 'ab', extra: 1 },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json<ErrorBody>().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 BAD_REQUEST for malformed JSON', async () => {
        app = await appWithRoutes();

        const response = await app.inject({
            method: 'POST',
            url: '/test/validate',
            headers: { 'content-type': 'application/json' },
            payload: '{bad',
        });

        expect(response.statusCode).toBe(400);
        expect(response.json<ErrorBody>().error.code).toBe('BAD_REQUEST');
    });

    it('hides the cause and the stack of unexpected errors', async () => {
        app = await appWithRoutes();

        const response = await app.inject('/test/boom');

        expect(response.statusCode).toBe(500);
        expect(response.json<ErrorBody>().error).toEqual({
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong',
        });
        expect(response.body).not.toContain('hunter2');
        expect(response.body.toLowerCase()).not.toContain('stack');
    });

    it('uses the standard format for unknown routes', async () => {
        app = await appWithRoutes();

        const response = await app.inject('/nope');

        expect(response.statusCode).toBe(404);
        expect(response.json<ErrorBody>().error.code).toBe('NOT_FOUND');
    });
});

describe('rate limiting', () => {
    it('returns 429 RATE_LIMITED after the limit is reached', async () => {
        app = await appWithRoutes({ RATE_LIMIT_MAX: '2' });

        const statuses: number[] = [];
        for (let i = 0; i < 3; i += 1) {
            statuses.push((await app.inject('/test/ping')).statusCode);
        }

        expect(statuses).toEqual([200, 200, 429]);
        const limited = await app.inject('/test/ping');
        expect(limited.json<ErrorBody>().error.code).toBe('RATE_LIMITED');
    });

    it('also limits requests to unknown routes', async () => {
        app = await appWithRoutes({ RATE_LIMIT_MAX: '2' });

        const statuses: number[] = [];
        for (let i = 0; i < 3; i += 1) {
            statuses.push((await app.inject('/nope')).statusCode);
        }

        expect(statuses).toEqual([404, 404, 429]);
    });
});
