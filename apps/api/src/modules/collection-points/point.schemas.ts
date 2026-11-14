import { z } from 'zod';
import type { CollectionPoint, Neighborhood } from '../../generated/prisma/client';
import { iso } from '../../lib/dates';

export const categorySchema = z.enum([
    'PET_VET',
    'EDUCATION',
    'HEALTH',
    'GROCERY_FOOD',
    'COMMERCE_SERVICES',
]);
export const precisionSchema = z.enum(['HOUSE_NUMBER', 'STREET', 'PLACE_NAME', 'NEIGHBORHOOD']);
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .transform((value) => (value === '' ? null : value))
        .nullable()
        .optional();

export const latitudeField = z.number().min(-90).max(90);
export const longitudeField = z.number().min(-180).max(180);

export const publicPointSchema = z.object({
    id: z.string(),
    name: z.string(),
    neighborhoodId: z.string(),
    neighborhood: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    category: categorySchema,
    openingHours: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    locationPrecision: precisionSchema,
    outsideMainArea: z.boolean(),
});

export const adminPointSchema = publicPointSchema.extend({
    status: statusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});

type PointWithNeighborhood = CollectionPoint & { neighborhood: Neighborhood };

export function toPublicPointDto(point: PointWithNeighborhood): z.infer<typeof publicPointSchema> {
    return {
        id: point.id,
        name: point.name,
        neighborhoodId: point.neighborhoodId,
        neighborhood: point.neighborhood.name,
        address: point.address,
        phone: point.phone,
        category: point.category,
        openingHours: point.openingHours,
        latitude: point.latitude,
        longitude: point.longitude,
        locationPrecision: point.locationPrecision,
        outsideMainArea: point.outsideMainArea,
    };
}

export function toAdminPointDto(point: PointWithNeighborhood): z.infer<typeof adminPointSchema> {
    return {
        ...toPublicPointDto(point),
        status: point.status,
        createdAt: iso(point.createdAt),
        updatedAt: iso(point.updatedAt),
    };
}
