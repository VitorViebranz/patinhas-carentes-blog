import { loadEnv } from '../config/env';
import { createPrismaClient } from '../lib/prisma';
import { seedDatabase } from './seed';

async function main(): Promise<void> {
    const env = loadEnv();
    const prisma = createPrismaClient(env.DATABASE_URL);
    try {
        const result = await seedDatabase(prisma, {
            adminEmail: process.env['SEED_ADMIN_EMAIL'],
            adminPassword: process.env['SEED_ADMIN_PASSWORD'],
        });
        const admin = result.adminCreated ? 'first admin created' : 'no admin created';
        process.stdout.write(
            `Seed done: ${result.neighborhoods} neighborhoods, ${result.points} points, ${admin}.\n`,
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    process.stderr.write(
        `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
});
