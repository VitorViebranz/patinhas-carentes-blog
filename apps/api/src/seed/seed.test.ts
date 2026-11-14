import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../test/helpers/build-test-app';
import { resetDatabase } from '../../test/helpers/kit';
import { verifyPassword } from '../lib/password';
import { seedDatabase } from './seed';

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
});
afterAll(async () => {
    await app.close();
});
beforeEach(async () => {
    await resetDatabase(app);
});

describe('seedDatabase', () => {
    it('loads the 166 points and 42 neighborhoods with the known data quality', async () => {
        const result = await seedDatabase(app.prisma);

        expect(result).toEqual({ neighborhoods: 42, points: 166, adminCreated: false });
        expect(await app.prisma.neighborhood.count()).toBe(42);
        expect(await app.prisma.collectionPoint.count()).toBe(166);
        expect(
            await app.prisma.collectionPoint.count({
                where: { OR: [{ phone: null }, { phone: '' }] },
            }),
        ).toBe(35);
        expect(await app.prisma.collectionPoint.count({ where: { address: null } })).toBe(2);
        expect(
            await app.prisma.collectionPoint.count({
                where: { locationPrecision: 'NEIGHBORHOOD' },
            }),
        ).toBe(12);
    });

    it('puts every point inside valid coordinates, near Joinville', async () => {
        await seedDatabase(app.prisma);

        const points = await app.prisma.collectionPoint.findMany();

        for (const point of points) {
            expect(point.latitude).toBeGreaterThan(-26.6);
            expect(point.latitude).toBeLessThan(-26.0);
            expect(point.longitude).toBeGreaterThan(-49.2);
            expect(point.longitude).toBeLessThan(-48.5);
        }
    });

    it('marks the outside areas', async () => {
        await seedDatabase(app.prisma);

        const outside = await app.prisma.neighborhood.findMany({
            where: { outsideMainArea: true },
        });

        expect(outside.map((item) => item.name).sort()).toEqual(
            ['Garuva', 'Pirabeiraba', 'Rio Bonito', 'São Francisco do Sul'].sort(),
        );
    });

    it('is idempotent and does not overwrite edits made in the panel', async () => {
        await seedDatabase(app.prisma);
        const point = await app.prisma.collectionPoint.findFirstOrThrow({
            where: { name: 'Animal Farma' },
        });
        await app.prisma.collectionPoint.update({
            where: { id: point.id },
            data: { phone: '(47) 0000-0000' },
        });

        await seedDatabase(app.prisma);

        expect(await app.prisma.collectionPoint.count()).toBe(166);
        expect(await app.prisma.neighborhood.count()).toBe(42);
        const after = await app.prisma.collectionPoint.findUniqueOrThrow({
            where: { id: point.id },
        });
        expect(after.phone).toBe('(47) 0000-0000');
    });

    it('creates the site settings with the values confirmed by the NGO', async () => {
        await seedDatabase(app.prisma);

        const settings = await app.prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });

        expect(settings).toMatchObject({
            gramsPerCap: 2.5,
            kgPriceBrl: 2,
            spayCostBrl: 350,
            monthlyAverageKg: 1500,
            animalsServedYear: null,
            cnpj: '45559299000157',
            pixKey: '45559299000157',
            instagramHandle: 'patinhascarentesjoinville',
        });
    });

    it('creates the first admin once, with a hashed password', async () => {
        const options = {
            adminEmail: ' Admin@Example.com ',
            adminPassword: 'first-admin-password',
        };

        const first = await seedDatabase(app.prisma, options);
        const second = await seedDatabase(app.prisma, options);

        expect([first.adminCreated, second.adminCreated]).toEqual([true, false]);
        const admin = await app.prisma.user.findUniqueOrThrow({
            where: { email: 'admin@example.com' },
        });
        expect(admin.role).toBe('ADMIN');
        expect(await verifyPassword('first-admin-password', admin.passwordHash)).toBe(true);
    });

    it('refuses a weak admin password', async () => {
        await expect(
            seedDatabase(app.prisma, { adminEmail: 'a@example.com', adminPassword: 'short' }),
        ).rejects.toThrow(/SEED_ADMIN_PASSWORD/);
    });
});
