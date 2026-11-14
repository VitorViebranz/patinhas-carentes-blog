import { doseKg, goalKg, monthlyReportFigures } from '@patinhas/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { MonthlyReport } from '../../generated/prisma/client';
import { compact } from '../../lib/compact';
import { iso, isoOrNull } from '../../lib/dates';
import { replyWithEtag } from '../../lib/etag';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';
import { optionalText } from '../collection-points/point.schemas';
import { assertVisible } from '../features/features.service';
import { getSettings } from '../site-settings/settings.service';

const monthField = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');
const kgField = z.number().min(0).max(10_000_000);
const moneyField = z.number().min(0).max(100_000_000).nullable().optional();
const countField = z.number().int().min(0).max(1_000_000).nullable().optional();
const idParams = z.object({ id: z.uuid() });

const publicReportSchema = z.object({
    month: z.string(),
    totalKg: z.number(),
    capCount: z.number(),
    castrations: z.number(),
    remainingKg: z.number(),
    doses: z.number(),
    remainingKgToNextDose: z.number(),
    animalsVaccinated: z.number().nullable(),
    dosesApplied: z.number().nullable(),
    doseCostBrl: z.number().nullable(),
    medicationSpentBrl: z.number().nullable(),
    feedSpentBrl: z.number().nullable(),
    castrationsDone: z.number().nullable(),
    otherIncomeBrl: z.number().nullable(),
    outcomeSummary: z.string().nullable(),
    publishedAt: z.string().nullable(),
});

const adminReportSchema = publicReportSchema.extend({
    id: z.string(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    createdAt: z.string(),
});

interface Settings {
    gramsPerCap: number;
    kgPriceBrl: number;
    spayCostBrl: number;
    vaccineDoseCostBrl: number;
}

const numberOrNull = (value: { toString(): string } | null): number | null =>
    value === null ? null : Number(value);

const financeBody = {
    animalsVaccinated: countField,
    dosesApplied: countField,
    doseCostBrl: moneyField,
    medicationSpentBrl: moneyField,
    feedSpentBrl: moneyField,
    castrationsDone: countField,
    otherIncomeBrl: moneyField,
};

function toPublicDto(
    report: MonthlyReport,
    settings: Settings,
): z.infer<typeof publicReportSchema> {
    const totalKg = Number(report.totalKg);
    return {
        month: report.month,
        totalKg,
        ...monthlyReportFigures(totalKg, goalKg(settings), settings.gramsPerCap, doseKg(settings)),
        animalsVaccinated: report.animalsVaccinated,
        dosesApplied: report.dosesApplied,
        doseCostBrl: numberOrNull(report.doseCostBrl),
        medicationSpentBrl: numberOrNull(report.medicationSpentBrl),
        feedSpentBrl: numberOrNull(report.feedSpentBrl),
        castrationsDone: report.castrationsDone,
        otherIncomeBrl: numberOrNull(report.otherIncomeBrl),
        outcomeSummary: report.outcomeSummary,
        publishedAt: isoOrNull(report.publishedAt),
    };
}

function toAdminDto(report: MonthlyReport, settings: Settings): z.infer<typeof adminReportSchema> {
    return {
        ...toPublicDto(report, settings),
        id: report.id,
        status: report.status,
        createdAt: iso(report.createdAt),
    };
}

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/monthly-reports',
        {
            schema: {
                tags: ['public'],
                response: { 200: z.object({ items: z.array(publicReportSchema) }) },
            },
        },
        async (request, reply) => {
            await assertVisible(app.prisma, 'page.report');
            const [reports, settings] = await Promise.all([
                app.prisma.monthlyReport.findMany({
                    where: { status: 'PUBLISHED' },
                    orderBy: { month: 'desc' },
                }),
                getSettings(app.prisma),
            ]);
            const payload = { items: reports.map((report) => toPublicDto(report, settings)) };
            if (replyWithEtag(request, reply, payload, 30)) return reply;
            return payload;
        },
    );

    route.get(
        '/monthly-reports/latest',
        { schema: { tags: ['public'], response: { 200: publicReportSchema } } },
        async () => {
            await assertVisible(app.prisma, 'page.report');
            const [report, settings] = await Promise.all([
                app.prisma.monthlyReport.findFirst({
                    where: { status: 'PUBLISHED' },
                    orderBy: { month: 'desc' },
                }),
                getSettings(app.prisma),
            ]);
            if (!report) throw new NotFoundError('No published report yet');
            return toPublicDto(report, settings);
        },
    );

    const tags = ['admin: monthly reports'];
    const guard = { onRequest: app.requireAuth };

    async function load(id: string): Promise<MonthlyReport> {
        const report = await app.prisma.monthlyReport.findUnique({ where: { id } });
        if (!report) throw new NotFoundError('Report not found');
        return report;
    }

    route.get(
        '/admin/monthly-reports',
        {
            ...guard,
            schema: {
                tags,
                querystring: paginationQuery,
                response: {
                    200: z.object({
                        items: z.array(adminReportSchema),
                        meta: paginationMetaSchema,
                    }),
                },
            },
        },
        async (request) => {
            const { page, pageSize } = request.query;
            const [reports, total, settings] = await Promise.all([
                app.prisma.monthlyReport.findMany({
                    orderBy: { month: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                app.prisma.monthlyReport.count(),
                getSettings(app.prisma),
            ]);
            return {
                items: reports.map((report) => toAdminDto(report, settings)),
                meta: paginationMeta(page, pageSize, total),
            };
        },
    );

    route.post(
        '/admin/monthly-reports',
        {
            ...guard,
            schema: {
                tags,
                body: z.strictObject({
                    month: monthField,
                    totalKg: kgField,
                    ...financeBody,
                    outcomeSummary: optionalText(500),
                }),
                response: { 201: adminReportSchema },
            },
        },
        async (request, reply) => {
            const { month, totalKg, outcomeSummary, ...finance } = request.body;
            if (await app.prisma.monthlyReport.findUnique({ where: { month } })) {
                throw new ConflictError('There is already a report for this month');
            }
            const created = await app.prisma.monthlyReport.create({
                data: { month, totalKg, outcomeSummary: outcomeSummary ?? null, ...compact(finance) },
            });
            return reply.code(201).send(toAdminDto(created, await getSettings(app.prisma)));
        },
    );

    route.patch(
        '/admin/monthly-reports/:id',
        {
            ...guard,
            schema: {
                tags,
                params: idParams,
                body: z.strictObject({
                    totalKg: kgField.optional(),
                    ...financeBody,
                    outcomeSummary: optionalText(500),
                }),
                response: { 200: adminReportSchema },
            },
        },
        async (request) => {
            const existing = await load(request.params.id);
            const updated = await app.prisma.monthlyReport.update({
                where: { id: existing.id },
                data: compact(request.body),
            });
            return toAdminDto(updated, await getSettings(app.prisma));
        },
    );

    for (const [action, status] of [
        ['publish', 'PUBLISHED'],
        ['unpublish', 'DRAFT'],
    ] as const) {
        route.post(
            `/admin/monthly-reports/:id/${action}`,
            { ...guard, schema: { tags, params: idParams, response: { 200: adminReportSchema } } },
            async (request) => {
                const existing = await load(request.params.id);
                const updated = await app.prisma.monthlyReport.update({
                    where: { id: existing.id },
                    data: {
                        status,
                        publishedAt:
                            status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
                    },
                });
                return toAdminDto(updated, await getSettings(app.prisma));
            },
        );
    }
}
