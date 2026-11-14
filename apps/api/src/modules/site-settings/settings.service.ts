import type { PrismaClient, SiteSettings } from '../../generated/prisma/client';

export async function getSettings(prisma: PrismaClient): Promise<SiteSettings> {
    return prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}
