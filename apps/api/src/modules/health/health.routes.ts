import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const READY_TIMEOUT_MS = 2000;

const healthResponse = z.object({
    status: z.literal('ok'),
    uptimeSeconds: z.number(),
});

const readyResponse = z.object({
    status: z.enum(['ok', 'unavailable']),
    checks: z.object({ database: z.enum(['up', 'down']) }),
});

async function isDatabaseUp(app: FastifyInstance): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Database check timed out')), READY_TIMEOUT_MS);
    });

    try {
        await Promise.race([app.prisma.$queryRaw`SELECT 1`, timeout]);
        return true;
    } catch (error) {
        app.log.warn({ err: error }, 'Readiness check failed');
        return false;
    } finally {
        clearTimeout(timer);
    }
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/health',
        {
            config: { rateLimit: false },
            schema: {
                tags: ['health'],
                summary: 'Process liveness',
                response: { 200: healthResponse },
            },
        },
        async () => ({ status: 'ok' as const, uptimeSeconds: Math.round(process.uptime()) }),
    );

    route.get(
        '/ready',
        {
            config: { rateLimit: false },
            schema: {
                tags: ['health'],
                summary: 'Readiness, including database connectivity',
                response: { 200: readyResponse, 503: readyResponse },
            },
        },
        async (_request, reply) => {
            const databaseUp = await isDatabaseUp(app);
            const payload = {
                status: databaseUp ? ('ok' as const) : ('unavailable' as const),
                checks: { database: databaseUp ? ('up' as const) : ('down' as const) },
            };
            return reply.code(databaseUp ? 200 : 503).send(payload);
        },
    );
}
