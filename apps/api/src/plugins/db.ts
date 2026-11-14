import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Env } from '../config/env';
import { createPrismaClient } from '../lib/prisma';
import type { PrismaClient } from '../generated/prisma/client';

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

interface DbOptions {
    env: Env;
}

async function dbPlugin(app: FastifyInstance, options: DbOptions): Promise<void> {
    const prisma = createPrismaClient(options.env.DATABASE_URL);

    app.decorate('prisma', prisma);
    app.addHook('onClose', async () => {
        await prisma.$disconnect();
    });
}

export default fp(dbPlugin, { name: 'db' });
