import { doseKg, goalKg } from '@patinhas/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { SiteSettings } from '../../generated/prisma/client';
import { compact } from '../../lib/compact';
import { iso } from '../../lib/dates';
import { replyWithEtag } from '../../lib/etag';
import { getSettings } from './settings.service';

const adminSettingsSchema = z.object({
    gramsPerCap: z.number(),
    kgPriceBrl: z.number(),
    spayCostBrl: z.number(),
    vaccineDoseCostBrl: z.number(),
    kgPer100LBag: z.number(),
    doseGoalKg: z.number(),
    goalKg: z.number(),
    monthlyAverageKg: z.number(),
    animalsServedYear: z.number().nullable(),
    cnpj: z.string().nullable(),
    pixKey: z.string().nullable(),
    whatsappNumber: z.string().nullable(),
    instagramHandle: z.string().nullable(),
    adoptionUrl: z.string().nullable(),
    hiddenFeatures: z.array(z.string()),
    updatedAt: z.string(),
});

const publicSettingsSchema = adminSettingsSchema.omit({ updatedAt: true }).extend({
    collectionPointCount: z.number(),
    neighborhoodCount: z.number(),
});

const nullableText = <T extends z.ZodType<string>>(schema: T) =>
    z
        .union([z.literal('').transform(() => null), schema])
        .nullable()
        .optional();

const updateBody = z.strictObject({
    gramsPerCap: z.number().positive().max(1000).optional(),
    kgPriceBrl: z.number().positive().max(1000).optional(),
    spayCostBrl: z.number().positive().max(1_000_000).optional(),
    vaccineDoseCostBrl: z.number().positive().max(1_000_000).optional(),
    kgPer100LBag: z.number().positive().max(1000).optional(),
    monthlyAverageKg: z.number().min(0).max(10_000_000).optional(),
    animalsServedYear: z.number().int().min(0).max(1_000_000).nullable().optional(),
    cnpj: nullableText(z.string().regex(/^\d{14}$/, 'Digits only (14 digits)')),
    pixKey: nullableText(z.string().trim().min(3).max(140)),
    whatsappNumber: nullableText(z.string().regex(/^\d{10,15}$/, 'Digits only, with country code')),
    instagramHandle: nullableText(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'Handle without @')),
    adoptionUrl: nullableText(z.url({ protocol: /^https?$/ }).max(500)),
});

function sharedFields(settings: SiteSettings) {
    return {
        gramsPerCap: settings.gramsPerCap,
        kgPriceBrl: settings.kgPriceBrl,
        spayCostBrl: settings.spayCostBrl,
        vaccineDoseCostBrl: settings.vaccineDoseCostBrl,
        kgPer100LBag: settings.kgPer100LBag,
        doseGoalKg: doseKg(settings),
        goalKg: goalKg(settings),
        monthlyAverageKg: settings.monthlyAverageKg,
        animalsServedYear: settings.animalsServedYear,
        cnpj: settings.cnpj,
        pixKey: settings.pixKey,
        whatsappNumber: settings.whatsappNumber,
        instagramHandle: settings.instagramHandle,
        adoptionUrl: settings.adoptionUrl,
        hiddenFeatures: settings.hiddenFeatures,
    };
}

function toAdminDto(settings: SiteSettings): z.infer<typeof adminSettingsSchema> {
    return { ...sharedFields(settings), updatedAt: iso(settings.updatedAt) };
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/site-settings',
        { schema: { tags: ['public'], response: { 200: publicSettingsSchema } } },
        async (request, reply) => {
            const [settings, collectionPointCount, neighborhoodCount] = await Promise.all([
                getSettings(app.prisma),
                app.prisma.collectionPoint.count({ where: { status: 'ACTIVE' } }),
                app.prisma.neighborhood.count(),
            ]);
            const payload = { ...sharedFields(settings), collectionPointCount, neighborhoodCount };
            if (replyWithEtag(request, reply, payload, 30)) return reply;
            return payload;
        },
    );

    route.get(
        '/admin/site-settings',
        {
            onRequest: app.requireAuth,
            schema: { tags: ['admin: settings'], response: { 200: adminSettingsSchema } },
        },
        async () => toAdminDto(await getSettings(app.prisma)),
    );

    route.patch(
        '/admin/site-settings',
        {
            onRequest: app.requireAdmin,
            schema: {
                tags: ['admin: settings'],
                body: updateBody,
                response: { 200: adminSettingsSchema },
            },
        },
        async (request) => {
            await getSettings(app.prisma);
            const updated = await app.prisma.siteSettings.update({
                where: { id: 1 },
                data: compact(request.body),
            });
            return toAdminDto(updated);
        },
    );
}
