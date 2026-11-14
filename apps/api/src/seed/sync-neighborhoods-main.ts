import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env';
import { CachedGeocoder, NominatimGeocoder } from '../lib/geocoder';
import { createPrismaClient } from '../lib/prisma';
import {
    syncNeighborhoods,
    type OfficialNeighborhood,
    type SyncReport,
} from '../modules/neighborhoods/sync-neighborhoods';

const LIST_FILE = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../seed/official-neighborhoods.json',
);

function describe(report: SyncReport): string {
    const lines = [
        `Neighborhoods: ${report.created.length} created, ${report.existing.length} already existed, ${report.failed.length} not located.`,
    ];
    if (report.created.length > 0) lines.push(`Created: ${report.created.join(', ')}`);
    if (report.failed.length > 0) {
        lines.push(
            'Not located (add latitude and longitude to seed/official-neighborhoods.json and run again):',
            ...report.failed.map((item) => `  ${item.name} (${item.reason})`),
        );
    }
    return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
    const env = loadEnv();
    const prisma = createPrismaClient(env.DATABASE_URL);
    try {
        const list = JSON.parse(await readFile(LIST_FILE, 'utf8')) as OfficialNeighborhood[];
        const geocoder = new CachedGeocoder(
            new NominatimGeocoder({ baseUrl: env.NOMINATIM_URL, userAgent: env.GEOCODER_USER_AGENT }),
            prisma,
        );
        process.stdout.write(describe(await syncNeighborhoods(prisma, geocoder, list)));
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    process.stderr.write(
        `Neighborhood sync failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
});
