import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { loadEnv, type Env } from '../../src/config/env';
import type { Geocoder } from '../../src/lib/geocoder';
import type { PostalLookup } from '../../src/lib/postal-code';

export const TEST_DATABASE_URL =
    process.env['TEST_DATABASE_URL'] ?? 'postgresql://postgres@localhost:5432/patinhas_test';

export const ORIGIN = 'http://localhost:5173';

export const TEST_UPLOAD_DIR = path.join(os.tmpdir(), `patinhas-test-uploads-${process.pid}`);

export function testEnv(overrides: Record<string, string> = {}): Env {
    return loadEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: TEST_DATABASE_URL,
        SESSION_SECRET: 'test-secret-with-at-least-32-characters',
        ALLOWED_ORIGINS: ORIGIN,
        UPLOAD_DIR: TEST_UPLOAD_DIR,

        AUTH_RATE_LIMIT_MAX: '1000',
        HELP_REQUEST_RATE_LIMIT_MAX: '1000',
        GEOCODE_RATE_LIMIT_MAX: '1000',
        RATE_LIMIT_MAX: '10000',
        ...overrides,
    });
}

export interface LogCapture {
    lines: string[];
    stream: { write(message: string): void };
}

export function captureLogs(): LogCapture {
    const lines: string[] = [];
    return {
        lines,
        stream: {
            write(message: string) {
                lines.push(message);
            },
        },
    };
}

interface BuildOptions {
    logs?: LogCapture;
    geocoder?: Geocoder;
    postalLookup?: PostalLookup;
}

export async function buildTestApp(
    overrides: Record<string, string> = {},
    logs?: LogCapture,
    options: BuildOptions = {},
): Promise<FastifyInstance> {
    const capture = logs ?? options.logs;
    return buildApp({
        env: testEnv(overrides),
        ...(capture ? { logStream: capture.stream } : {}),
        ...(options.geocoder ? { geocoder: options.geocoder } : {}),
        ...(options.postalLookup ? { postalLookup: options.postalLookup } : {}),
    });
}
