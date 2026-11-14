import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Neighborhood } from '../../generated/prisma/client';
import { replyWithEtag } from '../../lib/etag';

export const neighborhoodSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    outsideMainArea: z.boolean(),
    pointCount: z.number(),
});

export function toNeighborhoodDto(
    row: Neighborhood,
    pointCount: number,
): z.infer<typeof neighborhoodSchema> {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        latitude: row.latitude,
        longitude: row.longitude,
        outsideMainArea: row.outsideMainArea,
        pointCount,
    };
}

export async function neighborhoodsRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/neighborhoods',
        {
            schema: {
                tags: ['public'],
                response: { 200: z.object({ items: z.array(neighborhoodSchema) }) },
            },
        },
        async (request, reply) => {
            const rows = await app.prisma.neighborhood.findMany({
                orderBy: { name: 'asc' },
                include: {
                    _count: { select: { collectionPoints: { where: { status: 'ACTIVE' } } } },
                },
            });
            const payload = {
                items: rows.map((row) => toNeighborhoodDto(row, row._count.collectionPoints)),
            };
            if (replyWithEtag(request, reply, payload)) return reply;
            return payload;
        },
    );
}
