import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { replyWithEtag } from '../../lib/etag';
import { assertVisible } from '../features/features.service';
import { publicPointSchema, toPublicPointDto } from './point.schemas';

export async function publicPointsRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/collection-points',
        {
            schema: {
                tags: ['public'],
                response: { 200: z.object({ items: z.array(publicPointSchema) }) },
            },
        },
        async (request, reply) => {
            await assertVisible(app.prisma, 'home.points');
            const points = await app.prisma.collectionPoint.findMany({
                where: { status: 'ACTIVE' },
                include: { neighborhood: true },
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
            });
            const payload = { items: points.map(toPublicPointDto) };
            if (replyWithEtag(request, reply, payload)) return reply;
            return payload;
        },
    );
}
