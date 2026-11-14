import type { FastifyServerOptions } from 'fastify';
import type { Env } from '../config/env';

export const REDACTED_PATHS = [
    'req.headers.cookie',
    'req.headers.authorization',
    'res.headers["set-cookie"]',
    'req.body',
    'body',
    '*.password',
    '*.passwordHash',
    '*.email',
    '*.phone',
    '*.contact',
    '*.requesterName',
];

export function buildLoggerOptions(env: Env): Exclude<FastifyServerOptions['logger'], boolean> {
    return {
        level: env.LOG_LEVEL,
        redact: { paths: REDACTED_PATHS, censor: '[Redacted]' },
    };
}
