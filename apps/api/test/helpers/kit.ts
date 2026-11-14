import type { FastifyInstance, InjectOptions } from 'fastify';
import type { Coordinates, Geocoder } from '../../src/lib/geocoder';
import type { PostalAddress, PostalLookup } from '../../src/lib/postal-code';
import { hashPassword } from '../../src/lib/password';
import { ORIGIN } from './build-test-app';

const TABLES = [
    'pickups',
    'sessions',
    'help_requests',
    'stories',
    'media_files',
    'monthly_reports',
    'collection_points',
    'neighborhoods',
    'site_settings',
    'geocode_cache',
    'users',
];

export async function resetDatabase(app: FastifyInstance): Promise<void> {
    await app.prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
}

export const DEFAULT_PASSWORD = 'a-good-password-123';

interface UserInput {
    email?: string;
    role?: 'ADMIN' | 'EDITOR';
    password?: string;
    isActive?: boolean;
    name?: string;
}

let counter = 0;

export async function createUser(app: FastifyInstance, input: UserInput = {}) {
    counter += 1;
    return app.prisma.user.create({
        data: {
            name: input.name ?? `User ${counter}`,
            email: input.email ?? `user${counter}@example.com`,
            role: input.role ?? 'EDITOR',
            isActive: input.isActive ?? true,
            passwordHash: await hashPassword(input.password ?? DEFAULT_PASSWORD),
        },
    });
}

export async function login(
    app: FastifyInstance,
    email: string,
    password = DEFAULT_PASSWORD,
): Promise<string> {
    const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin: ORIGIN },
        payload: { email, password },
    });
    const cookie = response.cookies[0];
    if (response.statusCode !== 200 || !cookie) {
        throw new Error(`Test login failed with status ${response.statusCode}: ${response.body}`);
    }
    return `${cookie.name}=${cookie.value}`;
}

export async function createAndLogin(
    app: FastifyInstance,
    role: 'ADMIN' | 'EDITOR',
): Promise<{ cookie: string; userId: string }> {
    const user = await createUser(app, { role });
    return { cookie: await login(app, user.email), userId: user.id };
}

export function call(
    app: FastifyInstance,
    cookie: string | null,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload?: InjectOptions['payload'],
) {
    return app.inject({
        method,
        url,
        headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}) },
        ...(payload === undefined ? {} : { payload }),
    });
}

export async function createNeighborhood(
    app: FastifyInstance,
    overrides: { name?: string; slug?: string; outsideMainArea?: boolean } = {},
) {
    counter += 1;
    return app.prisma.neighborhood.create({
        data: {
            name: overrides.name ?? `Bairro ${counter}`,
            slug: overrides.slug ?? `bairro-${counter}`,
            latitude: -26.3,
            longitude: -48.85,
            outsideMainArea: overrides.outsideMainArea ?? false,
        },
    });
}

export class FakeGeocoder implements Geocoder {
    readonly queries: string[] = [];
    private sequence: (Coordinates | null)[] = [];

    constructor(private result: Coordinates | null = { latitude: -26.31, longitude: -48.84 }) {}

    setResult(result: Coordinates | null): void {
        this.result = result;
        this.sequence = [];
    }

    setSequence(...results: (Coordinates | null)[]): void {
        this.sequence = results;
    }

    async geocode(query: string): Promise<Coordinates | null> {
        this.queries.push(query);
        return this.sequence.length > 0 ? (this.sequence.shift() ?? null) : this.result;
    }
}

export class FakePostalLookup implements PostalLookup {
    readonly queries: string[] = [];

    constructor(private result: PostalAddress | null = null) {}

    setResult(result: PostalAddress | null): void {
        this.result = result;
    }

    async lookup(postalCode: string): Promise<PostalAddress | null> {
        this.queries.push(postalCode);
        return this.result;
    }
}
