import { normalizeText } from '@patinhas/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client';
import type { Env } from '../../config/env';
import { compact } from '../../lib/compact';
import { NotFoundError, UnprocessableError, ValidationError } from '../../lib/errors';
import type { Geocoder } from '../../lib/geocoder';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';
import { resolveLocation } from './location';
import {
    adminPointSchema,
    categorySchema,
    latitudeField,
    longitudeField,
    optionalText,
    precisionSchema,
    statusSchema,
    toAdminPointDto,
} from './point.schemas';

interface Options {
    env: Env;
    geocoder: Geocoder;
}

const idParams = z.object({ id: z.uuid() });

const coordinateFields = {
    latitude: latitudeField.optional(),
    longitude: longitudeField.optional(),
    locationPrecision: precisionSchema.optional(),
};

const bothCoordinates = (value: {
    latitude?: number | undefined;
    longitude?: number | undefined;
}) => (value.latitude === undefined) === (value.longitude === undefined);
const bothMessage = { message: 'Send latitude and longitude together' };

const createBody = z
    .strictObject({
        name: z.string().trim().min(1).max(160),
        neighborhoodId: z.uuid(),
        address: optionalText(200),
        phone: optionalText(40),
        category: categorySchema,
        openingHours: optionalText(200),
        ...coordinateFields,
    })
    .refine(bothCoordinates, bothMessage);

const updateBody = z
    .strictObject({
        name: z.string().trim().min(1).max(160).optional(),
        neighborhoodId: z.uuid().optional(),
        address: optionalText(200),
        phone: optionalText(40),
        category: categorySchema.optional(),
        openingHours: optionalText(200),
        status: statusSchema.optional(),
        ...coordinateFields,
    })
    .refine(bothCoordinates, bothMessage);

const listQuery = paginationQuery.extend({
    q: z.string().trim().max(100).optional(),
    neighborhoodId: z.uuid().optional(),
    status: statusSchema.optional(),
    missingPhone: z.stringbool().optional(),
    approximateLocation: z.stringbool().optional(),
});

const locationSource = z.enum(['manual', 'geocoded', 'neighborhood-fallback', 'unchanged']);
const writeResponse = adminPointSchema.extend({ locationSource });

export async function adminPointsRoutes(app: FastifyInstance, options: Options): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();
    const tags = ['admin: collection points'];
    const guard = { onRequest: app.requireAuth };
    const { geocoder } = options;

    async function loadPoint(id: string) {
        const point = await app.prisma.collectionPoint.findUnique({
            where: { id },
            include: { neighborhood: true },
        });
        if (!point) throw new NotFoundError('Collection point not found');
        return point;
    }

    async function loadNeighborhood(id: string) {
        const neighborhood = await app.prisma.neighborhood.findUnique({ where: { id } });
        if (!neighborhood) {
            throw new ValidationError('Invalid neighborhood', [
                { path: 'neighborhoodId', message: 'Neighborhood not found' },
            ]);
        }
        return neighborhood;
    }

    route.get(
        '/admin/collection-points',
        {
            ...guard,
            schema: {
                tags,
                querystring: listQuery,
                response: {
                    200: z.object({ items: z.array(adminPointSchema), meta: paginationMetaSchema }),
                },
            },
        },
        async (request) => {
            const { page, pageSize, q, neighborhoodId, status, missingPhone, approximateLocation } =
                request.query;

            const where: Prisma.CollectionPointWhereInput = {
                ...(neighborhoodId ? { neighborhoodId } : {}),
                ...(status ? { status } : {}),
                ...(approximateLocation ? { locationPrecision: 'NEIGHBORHOOD' as const } : {}),
                ...(missingPhone ? { OR: [{ phone: null }, { phone: '' }] } : {}),
            };
            const all = await app.prisma.collectionPoint.findMany({
                where,
                include: { neighborhood: true },
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
            });

            const needle = q ? normalizeText(q) : '';
            const matching = needle
                ? all.filter((point) =>
                      normalizeText(
                          `${point.name} ${point.address ?? ''} ${point.neighborhood.name}`,
                      ).includes(needle),
                  )
                : all;

            const items = matching
                .slice((page - 1) * pageSize, page * pageSize)
                .map(toAdminPointDto);
            return { items, meta: paginationMeta(page, pageSize, matching.length) };
        },
    );

    route.get(
        '/admin/collection-points/:id',
        { ...guard, schema: { tags, params: idParams, response: { 200: adminPointSchema } } },
        async (request) => toAdminPointDto(await loadPoint(request.params.id)),
    );

    route.post(
        '/admin/collection-points',
        { ...guard, schema: { tags, body: createBody, response: { 201: writeResponse } } },
        async (request, reply) => {
            const { latitude, longitude, locationPrecision, neighborhoodId, address, ...rest } =
                request.body;
            const neighborhood = await loadNeighborhood(neighborhoodId);
            const location = await resolveLocation(geocoder, {
                address: address ?? null,
                neighborhood,
                manual:
                    latitude !== undefined && longitude !== undefined
                        ? { latitude, longitude, locationPrecision }
                        : undefined,
            });

            const created = await app.prisma.collectionPoint.create({
                data: {
                    ...compact(rest),
                    name: rest.name,
                    category: rest.category,
                    neighborhoodId,
                    address: address ?? null,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    locationPrecision: location.locationPrecision,
                    outsideMainArea: neighborhood.outsideMainArea,
                },
                include: { neighborhood: true },
            });
            return reply
                .code(201)
                .send({ ...toAdminPointDto(created), locationSource: location.source });
        },
    );

    route.patch(
        '/admin/collection-points/:id',
        {
            ...guard,
            schema: { tags, params: idParams, body: updateBody, response: { 200: writeResponse } },
        },
        async (request) => {
            const existing = await loadPoint(request.params.id);
            const { latitude, longitude, locationPrecision, ...fields } = request.body;

            const neighborhood =
                fields.neighborhoodId && fields.neighborhoodId !== existing.neighborhoodId
                    ? await loadNeighborhood(fields.neighborhoodId)
                    : existing.neighborhood;
            const nextAddress = fields.address === undefined ? existing.address : fields.address;

            const manual = latitude !== undefined && longitude !== undefined;
            const placeChanged =
                nextAddress !== existing.address || neighborhood.id !== existing.neighborhoodId;

            let location: Awaited<ReturnType<typeof resolveLocation>> | null = null;
            if (manual || placeChanged) {
                location = await resolveLocation(geocoder, {
                    address: nextAddress,
                    neighborhood,
                    manual: manual ? { latitude, longitude, locationPrecision } : undefined,
                });
            }

            const updated = await app.prisma.collectionPoint.update({
                where: { id: existing.id },
                data: {
                    ...compact(fields),
                    ...(location
                        ? {
                              latitude: location.latitude,
                              longitude: location.longitude,
                              locationPrecision: location.locationPrecision,
                          }
                        : {}),
                    outsideMainArea: neighborhood.outsideMainArea,
                },
                include: { neighborhood: true },
            });
            return {
                ...toAdminPointDto(updated),
                locationSource: location?.source ?? ('unchanged' as const),
            };
        },
    );

    route.delete(
        '/admin/collection-points/:id',
        { ...guard, schema: { tags, params: idParams, response: { 200: adminPointSchema } } },
        async (request) => {
            const existing = await loadPoint(request.params.id);
            const updated = await app.prisma.collectionPoint.update({
                where: { id: existing.id },
                data: { status: 'INACTIVE' },
                include: { neighborhood: true },
            });
            return toAdminPointDto(updated);
        },
    );

    route.post(
        '/admin/collection-points/:id/geocode',
        {
            ...guard,
            config: {
                rateLimit: { max: options.env.GEOCODE_RATE_LIMIT_MAX, timeWindow: '1 minute' },
            },
            schema: { tags, params: idParams, response: { 200: adminPointSchema } },
        },
        async (request) => {
            const existing = await loadPoint(request.params.id);
            if (!existing.address) {
                throw new UnprocessableError('The point has no address to look up', 'NO_ADDRESS');
            }
            const location = await resolveLocation(geocoder, {
                address: existing.address,
                neighborhood: existing.neighborhood,
            });
            if (location.source !== 'geocoded') {
                throw new UnprocessableError(
                    'Address not found. Enter the coordinates by hand.',
                    'GEOCODING_FAILED',
                );
            }
            const updated = await app.prisma.collectionPoint.update({
                where: { id: existing.id },
                data: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    locationPrecision: location.locationPrecision,
                },
                include: { neighborhood: true },
            });
            return toAdminPointDto(updated);
        },
    );
}
