import { normalizeText } from './text';

export interface LatLon {
    latitude: number;
    longitude: number;
}

export const JOINVILLE_CENTER: LatLon = { latitude: -26.3045, longitude: -48.8487 };

export const MAX_DISTANCE_TO_NEAREST_POINT_METERS = 40_000;

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function distanceMeters(a: LatLon, b: LatLon): number {
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Ranked<T> {
    item: T;
    distanceMeters: number;
}

export function rankByDistance<T extends LatLon>(items: readonly T[], from: LatLon): Ranked<T>[] {
    return items
        .map((item, index) => ({ item, index, distanceMeters: distanceMeters(from, item) }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters || a.index - b.index)
        .map(({ item, distanceMeters: meters }) => ({ item, distanceMeters: meters }));
}

export function formatDistance(meters: number): string {
    if (meters < 950) return `a ${Math.round(meters / 10) * 10} m`;
    return `a ${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function isTooFarFromJoinville<T>(ranked: readonly Ranked<T>[]): boolean {
    const nearest = ranked[0];
    return nearest !== undefined && nearest.distanceMeters > MAX_DISTANCE_TO_NEAREST_POINT_METERS;
}

export const MIN_SEARCH_LENGTH = 2;

export interface SearchablePoint {
    name: string;
    address: string | null;
    neighborhood: string;
}

export function matchesSearch(point: SearchablePoint, query: string): boolean {
    const needle = normalizeText(query);
    if (needle.length < MIN_SEARCH_LENGTH) return true;
    return normalizeText(`${point.name} ${point.address ?? ''} ${point.neighborhood}`).includes(
        needle,
    );
}

export function isSearchActive(query: string): boolean {
    return normalizeText(query).length >= MIN_SEARCH_LENGTH;
}

export interface DirectionsPoint extends SearchablePoint {
    outsideMainArea: boolean;
    latitude?: number;
    longitude?: number;
    locationPrecision?: string;
}

export function directionsUrl(point: DirectionsPoint): string {
    const hasExactPosition =
        point.locationPrecision !== undefined &&
        point.locationPrecision !== 'NEIGHBORHOOD' &&
        point.latitude !== undefined &&
        point.longitude !== undefined;
    if (hasExactPosition) {
        return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
    }
    const place = point.address ? [point.address] : [point.name];
    const query = [...place, point.neighborhood, point.outsideMainArea ? '' : 'Joinville', 'SC']
        .filter(Boolean)
        .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const MAX_DEGREES_FROM_JOINVILLE = 1.5;

export function parseCoordinates(text: string): LatLon | null {
    const fromUrl =
        /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(text) ??
        /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(text);
    const plain = /^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(text);
    const match = fromUrl ?? plain;
    if (!match) return null;
    const latitude = Number((match[1] ?? '').replace(',', '.'));
    const longitude = Number((match[2] ?? '').replace(',', '.'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const nearJoinville =
        Math.abs(latitude - JOINVILLE_CENTER.latitude) <= MAX_DEGREES_FROM_JOINVILLE &&
        Math.abs(longitude - JOINVILLE_CENTER.longitude) <= MAX_DEGREES_FROM_JOINVILLE;
    return nearJoinville ? { latitude, longitude } : null;
}

export function telHref(phone: string): string {
    return `tel:+55${phone.replace(/\D/g, '')}`;
}
