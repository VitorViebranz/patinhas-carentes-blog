import type { Neighborhood } from '../../generated/prisma/client';
import type { Geocoder } from '../../lib/geocoder';

type Precision = 'HOUSE_NUMBER' | 'STREET' | 'PLACE_NAME' | 'NEIGHBORHOOD';

export interface ResolvedLocation {
    latitude: number;
    longitude: number;
    locationPrecision: Precision;

    source: 'manual' | 'geocoded' | 'neighborhood-fallback';
}

interface ManualLocation {
    latitude: number;
    longitude: number;
    locationPrecision?: Precision | undefined;
}

export function geocodeQuery(address: string, neighborhood: Neighborhood): string {
    const place = neighborhood.outsideMainArea
        ? `${neighborhood.name}, SC`
        : `${neighborhood.name}, Joinville, SC`;
    return `${address}, ${place}, Brasil`;
}

export function precisionForAddress(address: string): Precision {
    return /\d/.test(address) ? 'HOUSE_NUMBER' : 'STREET';
}

export function streetOnly(address: string): string | null {
    const withoutNumber = address
        .replace(/[,\s]+(n[ºo°.]*\s*)?\d+[\w/-]*\s*$/i, '')
        .replace(/[,\s]+s\/n\s*$/i, '')
        .trim();
    return withoutNumber && withoutNumber !== address.trim() ? withoutNumber : null;
}

export async function resolveLocation(
    geocoder: Geocoder,
    input: {
        address: string | null;
        neighborhood: Neighborhood;
        manual?: ManualLocation | undefined;
    },
): Promise<ResolvedLocation> {
    if (input.manual) {
        return {
            latitude: input.manual.latitude,
            longitude: input.manual.longitude,
            locationPrecision: input.manual.locationPrecision ?? 'PLACE_NAME',
            source: 'manual',
        };
    }

    if (input.address) {
        const found = await geocoder.geocode(geocodeQuery(input.address, input.neighborhood));
        if (found) {
            return {
                ...found,
                locationPrecision: precisionForAddress(input.address),
                source: 'geocoded',
            };
        }
    }

    const street = input.address ? streetOnly(input.address) : null;
    if (street) {
        const found = await geocoder.geocode(geocodeQuery(street, input.neighborhood));
        if (found) return { ...found, locationPrecision: 'STREET', source: 'geocoded' };
    }

    return {
        latitude: input.neighborhood.latitude,
        longitude: input.neighborhood.longitude,
        locationPrecision: 'NEIGHBORHOOD',
        source: 'neighborhood-fallback',
    };
}
