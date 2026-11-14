import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build-test-app';

interface OpenApiDocument {
    openapi: string;
    paths: Record<string, unknown>;
}

let app: FastifyInstance | undefined;

afterEach(async () => {
    await app?.close();
    app = undefined;
});

describe('swagger', () => {
    it('serves the OpenAPI document outside production', async () => {
        app = await buildTestApp();

        const response = await app.inject('/docs/json');

        expect(response.statusCode).toBe(200);
        const document = response.json<OpenApiDocument>();
        expect(document.openapi).toMatch(/^3\./);
        expect(Object.keys(document.paths)).toContain('/api/v1/health');
    });

    it('does not serve the docs UI in production', async () => {
        app = await buildTestApp({ NODE_ENV: 'production' });

        const response = await app.inject('/docs');

        expect(response.statusCode).toBe(404);
    });
});
