import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { AttemptLimiter } from '../../lib/attempt-limiter';
import { TooManyRequestsError, UnauthorizedError } from '../../lib/errors';
import { DUMMY_HASH_PROMISE, hashPassword, needsRehash, verifyPassword } from '../../lib/password';
import { emailField } from '../users/user.schemas';
import {
    createSession,
    deleteExpiredSessions,
    deleteSession,
    sessionCookieName,
} from './session.service';

interface AuthRoutesOptions {
    env: Env;
}

const sessionUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['ADMIN', 'EDITOR']),
});

const GENERIC_LOGIN_ERROR = 'Invalid e-mail or password';

export async function authRoutes(app: FastifyInstance, options: AuthRoutesOptions): Promise<void> {
    const { env } = options;
    const route = app.withTypeProvider<ZodTypeProvider>();
    const cookieName = sessionCookieName(env);
    const attempts = new AttemptLimiter(env.AUTH_RATE_LIMIT_MAX, 60_000);

    route.post(
        '/auth/login',
        {
            config: { rateLimit: { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: '1 minute' } },
            schema: {
                tags: ['auth'],
                body: z.strictObject({ email: emailField, password: z.string().min(1).max(200) }),
                response: { 200: z.object({ user: sessionUserSchema }) },
            },
        },
        async (request, reply) => {
            const { email, password } = request.body;

            const attemptKey = `${request.ip}|${email}`;
            if (!attempts.allow(attemptKey)) {
                throw new TooManyRequestsError('Too many login attempts');
            }

            const user = await app.prisma.user.findUnique({ where: { email } });

            const valid = await verifyPassword(
                password,
                user?.passwordHash ?? (await DUMMY_HASH_PROMISE),
            );
            if (!user || !user.isActive || !valid) throw new UnauthorizedError(GENERIC_LOGIN_ERROR);

            attempts.reset(attemptKey);

            if (needsRehash(user.passwordHash)) {
                await app.prisma.user.update({
                    where: { id: user.id },
                    data: { passwordHash: await hashPassword(password) },
                });
            }

            const previous = request.cookies[cookieName];
            if (previous) await deleteSession(app.prisma, env, previous);
            await deleteExpiredSessions(app.prisma);

            const { token, expiresAt } = await createSession(app.prisma, env, user.id);
            await app.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });

            void reply.setCookie(cookieName, token, {
                httpOnly: true,
                secure: env.COOKIE_SECURE,
                sameSite: 'lax',
                path: '/',
                expires: expiresAt,
            });
            return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        },
    );

    route.post('/auth/logout', { schema: { tags: ['auth'] } }, async (request, reply) => {
        const token = request.cookies[cookieName];
        if (token) await deleteSession(app.prisma, env, token);
        void reply.clearCookie(cookieName, {
            path: '/',
            httpOnly: true,
            secure: env.COOKIE_SECURE,
            sameSite: 'lax',
        });
        return reply.code(204).send();
    });

    route.get(
        '/auth/me',
        {
            onRequest: app.requireAuth,
            schema: { tags: ['auth'], response: { 200: z.object({ user: sessionUserSchema }) } },
        },
        async (request) => {
            return { user: request.user as NonNullable<typeof request.user> };
        },
    );
}
