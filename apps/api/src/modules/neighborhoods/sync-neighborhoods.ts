import { slugify } from '@patinhas/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError, UnprocessableError } from '../../lib/errors';
import type { Geocoder } from '../../lib/geocoder';
import {
    findOrCreateNeighborhood,
    isInsideJoinville,
    upsertNeighborhood,
} from './neighborhood-resolver';

export interface OfficialNeighborhood {
    name: string;
    latitude?: number;
    longitude?: number;
}

export interface SyncFailure {
    name: string;
    reason: string;
}

export interface SyncReport {
    created: string[];
    existing: string[];
    failed: SyncFailure[];
}

async function syncOne(
    prisma: PrismaClient,
    geocoder: Geocoder,
    item: OfficialNeighborhood,
): Promise<'created' | 'existing'> {
    const known = await prisma.neighborhood.findUnique({ where: { slug: slugify(item.name) } });
    if (known) return 'existing';

    if (item.latitude !== undefined && item.longitude !== undefined) {
        const position = { latitude: item.latitude, longitude: item.longitude };
        if (!isInsideJoinville(position)) {
            throw new UnprocessableError(
                'Coordinates are outside Joinville',
                'COORDINATES_OUTSIDE_JOINVILLE',
            );
        }
        await upsertNeighborhood(prisma, item.name, position);
        return 'created';
    }

    const result = await findOrCreateNeighborhood(prisma, geocoder, {
        postalCode: '',
        street: '',
        neighborhood: item.name,
        city: 'Joinville',
        state: 'SC',
    });
    return result.created ? 'created' : 'existing';
}

function reasonOf(error: unknown): string {
    if (error instanceof AppError) return error.code;
    return 'UNEXPECTED_ERROR';
}

export async function syncNeighborhoods(
    prisma: PrismaClient,
    geocoder: Geocoder,
    list: readonly OfficialNeighborhood[],
): Promise<SyncReport> {
    const report: SyncReport = { created: [], existing: [], failed: [] };
    for (const item of list) {
        try {
            const outcome = await syncOne(prisma, geocoder, item);
            report[outcome].push(item.name);
        } catch (error) {
            report.failed.push({ name: item.name, reason: reasonOf(error) });
        }
    }
    return report;
}
