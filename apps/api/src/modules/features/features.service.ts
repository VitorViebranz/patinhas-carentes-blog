import { isHidden, type FeatureKey } from '@patinhas/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { NotFoundError } from '../../lib/errors';
import { getSettings } from '../site-settings/settings.service';

export async function assertVisible(prisma: PrismaClient, key: FeatureKey): Promise<void> {
    const settings = await getSettings(prisma);
    if (isHidden(settings.hiddenFeatures, key)) {
        throw new NotFoundError('This page is not available');
    }
}

export async function setFeatureVisible(
    prisma: PrismaClient,
    key: FeatureKey,
    visible: boolean,
): Promise<string[]> {
    await getSettings(prisma);
    if (visible) {
        await prisma.$executeRaw`
            UPDATE "site_settings"
            SET "hidden_features" = array_remove(COALESCE("hidden_features", ARRAY[]::text[]), ${key}::text),
                "updated_at" = now()
            WHERE "id" = 1`;
    } else {
        await prisma.$executeRaw`
            UPDATE "site_settings"
            SET "hidden_features" = array_append(array_remove(COALESCE("hidden_features", ARRAY[]::text[]), ${key}::text), ${key}::text),
                "updated_at" = now()
            WHERE "id" = 1`;
    }
    return (await getSettings(prisma)).hiddenFeatures;
}
