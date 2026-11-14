import { normalizeText } from '@patinhas/shared';
import type { PrismaClient } from '../generated/prisma/client';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface Geocoder {
    geocode(query: string): Promise<Coordinates | null>;
}

type FetchLike = (
    url: string,
    init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{
    ok: boolean;
    json(): Promise<unknown>;
}>;

interface NominatimOptions {
    baseUrl: string;
    userAgent: string;

    minIntervalMs?: number;
    timeoutMs?: number;
    fetchImpl?: FetchLike;
}

export class NominatimGeocoder implements Geocoder {
    private lastRequestAt = 0;
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private readonly options: NominatimOptions) {}

    geocode(query: string): Promise<Coordinates | null> {
        const run = this.queue.then(() => this.request(query));
        this.queue = run.catch(() => undefined);
        return run;
    }

    private async request(query: string): Promise<Coordinates | null> {
        const interval = this.options.minIntervalMs ?? 1100;
        const wait = this.lastRequestAt + interval - Date.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        this.lastRequestAt = Date.now();

        const url = new URL('/search', this.options.baseUrl);
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', '1');
        url.searchParams.set('countrycodes', 'br');

        const fetchImpl = this.options.fetchImpl ?? (fetch as unknown as FetchLike);
        try {
            const response = await fetchImpl(url.toString(), {
                headers: { 'user-agent': this.options.userAgent, accept: 'application/json' },
                signal: AbortSignal.timeout(this.options.timeoutMs ?? 8000),
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return null;
            const first = data[0] as { lat?: string; lon?: string };
            const latitude = Number(first.lat);
            const longitude = Number(first.lon);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
            if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
            return { latitude, longitude };
        } catch {
            return null;
        }
    }
}

export class CachedGeocoder implements Geocoder {
    constructor(
        private readonly inner: Geocoder,
        private readonly prisma: PrismaClient,
    ) {}

    async geocode(query: string): Promise<Coordinates | null> {
        const key = normalizeText(query);
        const cached = await this.prisma.geocodeCache.findUnique({ where: { query: key } });
        if (cached) return { latitude: cached.latitude, longitude: cached.longitude };

        const found = await this.inner.geocode(query);
        if (found) {
            await this.prisma.geocodeCache.upsert({
                where: { query: key },
                create: { query: key, ...found },
                update: found,
            });
        }
        return found;
    }
}
