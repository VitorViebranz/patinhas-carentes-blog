import cookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';
import {
    findSessionUser,
    sessionCookieName,
    type SessionUser,
} from '../modules/auth/session.service';

declare module 'fastify' {
    interface FastifyRequest {
        user: SessionUser | null;
    }
    interface FastifyInstance {
        requireAuth: (request: FastifyRequest) => Promise<void>;

        requireAdmin: (request: FastifyRequest) => Promise<void>;
    }
}

interface AuthOptions {
    env: Env;
}

async function authPlugin(app: FastifyInstance, options: AuthOptions): Promise<void> {
    const { env } = options;
    await app.register(cookie);
    app.decorateRequest('user', null);

    const requireAuth = async (request: FastifyRequest): Promise<void> => {
        const token = request.cookies[sessionCookieName(env)];
        const user = token ? await findSessionUser(app.prisma, env, token) : null;
        if (!user) throw new UnauthorizedError('Login required');
        request.user = user;
    };

    app.decorate('requireAuth', requireAuth);
    app.decorate('requireAdmin', async (request: FastifyRequest) => {
        await requireAuth(request);
        if (request.user?.role !== 'ADMIN')
            throw new ForbiddenError('Administrator access required');
    });
}

export default fp(authPlugin, { name: 'auth', dependencies: ['db'] });
