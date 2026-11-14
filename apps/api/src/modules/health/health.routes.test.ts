import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';

interface ReadyBody {
    status: string;
    checks: { database: string };
}

let app: FastifyInstance | undefined;

afterEach(async () => {
    await app?.close();
    app = undefined;
});

describe('GET /api/v1/health', () => {
    it('returns ok with the process uptime', async () => {
        app = await buildTestApp();

        const response = await app.inject('/api/v1/health');

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: 'ok', uptimeSeconds: expect.any(Number) });
    });

    it('is not rate limited', async () => {
        app = await buildTestApp({ RATE_LIMIT_MAX: '1' });

        const statuses: number[] = [];
        for (let i = 0; i < 3; i += 1) {
            statuses.push((await app.inject('/api/v1/health')).statusCode);
        }

        expect(statuses).toEqual([200, 200, 200]);
    });
});

describe('GET /api/v1/ready', () => {
    it('returns 200 when the database answers', async () => {
        app = await buildTestApp();

        const response = await app.inject('/api/v1/ready');

        expect(response.statusCode).toBe(200);
        expect(response.json<ReadyBody>()).toEqual({ status: 'ok', checks: { database: 'up' } });
    });

    it('returns 503 when the database is unreachable', async () => {
        app = await buildTestApp({ DATABASE_URL: 'postgresql://postgres@localhost:1/nothing' });

        const response = await app.inject('/api/v1/ready');

        expect(response.statusCode).toBe(503);
        expect(response.json<ReadyBody>()).toEqual({
            status: 'unavailable',
            checks: { database: 'down' },
        });
    });
});
