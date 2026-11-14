import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Env } from '../config/env';
import { ForbiddenError } from '../lib/errors';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PROTECTED_PREFIXES = ['/api/v1/admin', '/api/v1/auth'];

interface CsrfOptions {
    env: Env;
}

async function csrfPlugin(app: FastifyInstance, options: CsrfOptions): Promise<void> {
    app.addHook('onRequest', async (request) => {
        if (!UNSAFE_METHODS.has(request.method)) return;
        const route = request.routeOptions.url ?? '';
        if (!PROTECTED_PREFIXES.some((prefix) => route.startsWith(prefix))) return;

        const origin = request.headers.origin;
        const own = `${request.protocol}://${request.headers.host ?? ''}`;
        if (!origin || (origin !== own && !options.env.ALLOWED_ORIGINS.includes(origin))) {
            throw new ForbiddenError('Request origin not allowed');
        }
    });
}

export default fp(csrfPlugin, { name: 'csrf' });
