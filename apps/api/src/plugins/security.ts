import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Env } from '../config/env';

interface SecurityOptions {
    env: Env;
}

async function securityPlugin(app: FastifyInstance, options: SecurityOptions): Promise<void> {
    await app.register(helmet, { global: true });

    await app.register(rateLimit, {
        global: true,
        max: options.env.RATE_LIMIT_MAX,
        timeWindow: '1 minute',
    });
}

export default fp(securityPlugin, { name: 'security' });
