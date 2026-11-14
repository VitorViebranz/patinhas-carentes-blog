import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { fileURLToPath } from 'node:url';

loadDotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const databaseUrl = process.env['DATABASE_URL'];

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    datasource: databaseUrl ? { url: databaseUrl } : {},
});
