import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { NotFoundError } from '../../lib/errors';
import type { Geocoder } from '../../lib/geocoder';
import { digitsOnly, type PostalLookup } from '../../lib/postal-code';
import { precisionSchema } from '../collection-points/point.schemas';
import { resolveLocation } from '../collection-points/location';
import {
    findOrCreateNeighborhood,
    type ResolvedNeighborhood,
} from '../neighborhoods/neighborhood-resolver';
import { neighborhoodSchema, toNeighborhoodDto } from '../neighborhoods/neighborhoods.routes';

interface Options {
    env: Env;
    geocoder: Geocoder;
    postalLookup: PostalLookup;
}

const postalAddressSchema = z.object({
    postalCode: z.string(),
    street: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
});

export async function addressesRoutes(app: FastifyInstance, options: Options): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();
    const tags = ['admin: addresses'];
    const rateLimit = { max: options.env.GEOCODE_RATE_LIMIT_MAX, timeWindow: '1 minute' };

    async function neighborhoodResponse({ neighborhood, created }: ResolvedNeighborhood) {
        const pointCount = await app.prisma.collectionPoint.count({
            where: { neighborhoodId: neighborhood.id, status: 'ACTIVE' },
        });
        return { created, neighborhood: toNeighborhoodDto(neighborhood, pointCount) };
    }

    route.get(
        '/postal-codes/:code',
        {
            config: { rateLimit },
            schema: {
                tags: ['public'],
                params: z.object({
                    code: z.string().regex(/^\d{5}-?\d{3}$/, 'Invalid postal code'),
                }),
                response: { 200: postalAddressSchema },
            },
        },
        async (request) => {
            const found = await options.postalLookup.lookup(digitsOnly(request.params.code));
            if (!found) throw new NotFoundError('Postal code not found');
            return found;
        },
    );

    route.post(
        '/admin/neighborhoods/from-postal-code',
        {
            onRequest: app.requireAuth,
            config: { rateLimit },
            schema: {
                tags,
                body: z.strictObject({
                    postalCode: z.string().regex(/^\d{5}-?\d{3}$/, 'Invalid postal code'),
                }),
                response: {
                    200: z.object({ created: z.boolean(), neighborhood: neighborhoodSchema }),
                },
            },
        },
        async (request) => {
            const address = await options.postalLookup.lookup(digitsOnly(request.body.postalCode));
            if (!address) throw new NotFoundError('Postal code not found');
            return neighborhoodResponse(
                await findOrCreateNeighborhood(app.prisma, options.geocoder, address),
            );
        },
    );

    route.post(
        '/admin/neighborhoods',
        {
            onRequest: app.requireAuth,
            config: { rateLimit },
            schema: {
                tags,
                body: z.strictObject({ name: z.string().trim().min(2).max(80) }),
                response: {
                    200: z.object({ created: z.boolean(), neighborhood: neighborhoodSchema }),
                },
            },
        },
        async (request) =>
            neighborhoodResponse(
                await findOrCreateNeighborhood(app.prisma, options.geocoder, {
                    postalCode: '',
                    street: '',
                    neighborhood: request.body.name,
                    city: 'Joinville',
                    state: 'SC',
                }),
            ),
    );

    route.post(
        '/admin/geocode-preview',
        {
            onRequest: app.requireAuth,
            config: { rateLimit },
            schema: {
                tags,
                body: z.strictObject({
                    address: z.string().trim().min(1).max(200),
                    neighborhoodId: z.uuid(),
                }),
                response: {
                    200: z.object({
                        found: z.boolean(),
                        latitude: z.number(),
                        longitude: z.number(),
                        locationPrecision: precisionSchema,
                    }),
                },
            },
        },
        async (request) => {
            const neighborhood = await app.prisma.neighborhood.findUnique({
                where: { id: request.body.neighborhoodId },
            });
            if (!neighborhood) throw new NotFoundError('Neighborhood not found');
            const location = await resolveLocation(options.geocoder, {
                address: request.body.address,
                neighborhood,
            });
            return {
                found: location.source === 'geocoded',
                latitude: location.latitude,
                longitude: location.longitude,
                locationPrecision: location.locationPrecision,
            };
        },
    );
}
