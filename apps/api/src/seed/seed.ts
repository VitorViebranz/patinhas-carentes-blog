import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '../generated/prisma/client';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../lib/password';

interface SeedNeighborhood {
    name: string;
    slug: string;
    latitude: number;
    longitude: number;
    outsideMainArea: boolean;
}

interface SeedPoint {
    name: string;
    neighborhood: string;
    address: string | null;
    phone: string | null;
    category: 'PET_VET' | 'EDUCATION' | 'HEALTH' | 'GROCERY_FOOD' | 'COMMERCE_SERVICES';
    latitude: number;
    longitude: number;
    locationPrecision: 'HOUSE_NUMBER' | 'STREET' | 'PLACE_NAME' | 'NEIGHBORHOOD';
    outsideMainArea: boolean;
}

export interface SeedOptions {
    adminEmail?: string | undefined;
    adminPassword?: string | undefined;
    seedDir?: string;
}

export interface SeedResult {
    neighborhoods: number;
    points: number;
    adminCreated: boolean;
}

const DEFAULT_SEED_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../seed',
);

async function readJson<T>(file: string): Promise<T> {
    return JSON.parse(await readFile(file, 'utf8')) as T;
}

export async function seedDatabase(
    prisma: PrismaClient,
    options: SeedOptions = {},
): Promise<SeedResult> {
    const dir = options.seedDir ?? DEFAULT_SEED_DIR;
    const neighborhoods = await readJson<SeedNeighborhood[]>(path.join(dir, 'neighborhoods.json'));
    const points = await readJson<SeedPoint[]>(path.join(dir, 'collection-points.json'));

    const idBySlugName = new Map<string, string>();
    for (const item of neighborhoods) {
        const row = await prisma.neighborhood.upsert({
            where: { slug: item.slug },
            create: item,
            update: {},
        });
        idBySlugName.set(item.name, row.id);
    }

    for (const point of points) {
        const neighborhoodId = idBySlugName.get(point.neighborhood);
        if (!neighborhoodId)
            throw new Error(`Seed point "${point.name}" has an unknown neighborhood`);

        const existing = await prisma.collectionPoint.findFirst({
            where: { name: point.name, neighborhoodId, address: point.address },
        });
        if (existing) continue;

        await prisma.collectionPoint.create({
            data: {
                name: point.name,
                neighborhoodId,
                address: point.address,
                phone: point.phone,
                category: point.category,
                latitude: point.latitude,
                longitude: point.longitude,
                locationPrecision: point.locationPrecision,
                outsideMainArea: point.outsideMainArea,
            },
        });
    }

    await prisma.siteSettings.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            whatsappNumber: '5547991457757',
            instagramHandle: 'patinhascarentesjoinville',
            adoptionUrl:
                'https://www.adoteca.com.br/protetor/patinhas-carentes-joinville-joinville-sc-5nwgys',
            monthlyAverageKg: 1500,
            cnpj: '45559299000157',
            pixKey: '45559299000157',
        },
        update: {},
    });

    let adminCreated = false;
    if (options.adminEmail && options.adminPassword) {
        if (options.adminPassword.length < MIN_PASSWORD_LENGTH) {
            throw new Error(
                `SEED_ADMIN_PASSWORD must have at least ${MIN_PASSWORD_LENGTH} characters`,
            );
        }
        const email = options.adminEmail.trim().toLowerCase();
        if (!(await prisma.user.findUnique({ where: { email } }))) {
            await prisma.user.create({
                data: {
                    name: 'Administrator',
                    email,
                    role: 'ADMIN',
                    passwordHash: await hashPassword(options.adminPassword),
                },
            });
            adminCreated = true;
        }
    }

    return { neighborhoods: neighborhoods.length, points: points.length, adminCreated };
}
