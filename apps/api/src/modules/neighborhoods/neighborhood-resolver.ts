import { JOINVILLE_CENTER, distanceMeters, normalizeText, slugify } from '@patinhas/shared';
import type { Neighborhood, PrismaClient } from '../../generated/prisma/client';
import { UnprocessableError } from '../../lib/errors';
import type { Coordinates, Geocoder } from '../../lib/geocoder';
import type { PostalAddress } from '../../lib/postal-code';

const SUPPORTED_CITY = 'joinville';
const MAX_DISTANCE_FROM_CENTER_METERS = 30_000;

export interface ResolvedNeighborhood {
    neighborhood: Neighborhood;
    created: boolean;
}

const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

function toDisplayName(raw: string): string {
    return raw
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            const lower = word.toLowerCase();
            return index > 0 && LOWERCASE_WORDS.has(lower)
                ? lower
                : lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

export function isInsideJoinville(found: Coordinates): boolean {
    return distanceMeters(JOINVILLE_CENTER, found) <= MAX_DISTANCE_FROM_CENTER_METERS;
}

function locationQueries(address: PostalAddress): string[] {
    const place = `${address.neighborhood}, Joinville, SC, Brasil`;
    return address.street ? [place, `${address.street}, ${place}`] : [place];
}

async function locate(geocoder: Geocoder, address: PostalAddress): Promise<Coordinates | null> {
    for (const query of locationQueries(address)) {
        const found = await geocoder.geocode(query);
        if (found && isInsideJoinville(found)) return found;
    }
    return null;
}

export async function findOrCreateNeighborhood(
    prisma: PrismaClient,
    geocoder: Geocoder,
    address: PostalAddress,
): Promise<ResolvedNeighborhood> {
    if (!address.neighborhood) {
        throw new UnprocessableError(
            'This postal code has no neighborhood',
            'POSTAL_CODE_WITHOUT_NEIGHBORHOOD',
        );
    }
    if (normalizeText(address.city) !== SUPPORTED_CITY) {
        throw new UnprocessableError(
            `This postal code belongs to ${address.city}, not Joinville`,
            'POSTAL_CODE_OTHER_CITY',
        );
    }

    const slug = slugify(address.neighborhood);
    const existing = await prisma.neighborhood.findUnique({ where: { slug } });
    if (existing) return { neighborhood: existing, created: false };

    const position = await locate(geocoder, address);
    if (!position) {
        throw new UnprocessableError(
            'Could not locate this neighborhood on the map',
            'NEIGHBORHOOD_NOT_LOCATED',
        );
    }

    return {
        neighborhood: await upsertNeighborhood(prisma, address.neighborhood, position),
        created: true,
    };
}

export async function upsertNeighborhood(
    prisma: PrismaClient,
    name: string,
    position: Coordinates,
): Promise<Neighborhood> {
    const slug = slugify(name);
    return prisma.neighborhood.upsert({
        where: { slug },
        create: {
            name: toDisplayName(name),
            slug,
            latitude: position.latitude,
            longitude: position.longitude,
            outsideMainArea: false,
        },
        update: {},
    });
}
