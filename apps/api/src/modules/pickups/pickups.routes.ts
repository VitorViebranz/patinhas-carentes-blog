import { doseKg, estimateKgFromBags, goalKg, monthlyReportFigures } from '@patinhas/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Prisma, SiteSettings } from '../../generated/prisma/client';
import { iso } from '../../lib/dates';
import { replyWithEtag } from '../../lib/etag';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';
import {
    PERIODS,
    brazilToday,
    dateOnly,
    formatDateOnly,
    periodStart,
    type Period,
} from '../../lib/periods';
import { categorySchema } from '../collection-points/point.schemas';
import { assertVisible } from '../features/features.service';
import { getSettings } from '../site-settings/settings.service';
import { rankEntries } from './ranking';

const LEADERBOARD_LIMIT = 50;
const MAX_PICKUP_KG = 5_000;
const EDITOR_DELETE_WINDOW_MS = 24 * 3_600_000;

const idParams = z.object({ id: z.uuid() });

const dateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .refine((value) => formatDateOnly(dateOnly(value)) === value, 'Not a real calendar date');

const figuresSchema = z.object({
    capCount: z.number(),
    castrations: z.number(),
    remainingKg: z.number(),
    doses: z.number(),
    remainingKgToNextDose: z.number(),
});

const leaderboardEntrySchema = z.object({
    rank: z.number(),
    pointId: z.string(),
    name: z.string(),
    neighborhood: z.string(),
    category: categorySchema,
    totalKg: z.number(),
    pickups: z.number(),
    lastPickupOn: z.string().nullable(),
});

const leaderboardSchema = figuresSchema.extend({
    period: z.enum(PERIODS),
    since: z.string().nullable(),
    totalKg: z.number(),
    pickups: z.number(),
    pointCount: z.number(),
    items: z.array(leaderboardEntrySchema),
});

const pointImpactSchema = figuresSchema.extend({
    point: z.object({
        id: z.string(),
        name: z.string(),
        neighborhood: z.string(),
        category: categorySchema,
    }),
    totalKg: z.number(),
    pickups: z.number(),
    firstPickupOn: z.string().nullable(),
    lastPickupOn: z.string().nullable(),
});

const adminPickupSchema = z.object({
    id: z.string(),
    pointId: z.string(),
    pointName: z.string(),
    pickedUpOn: z.string(),
    kg: z.number(),
    bags: z.number().nullable(),
    bagLiters: z.number().nullable(),
    createdAt: z.string(),
});

const pickupSummarySchema = z.object({
    pointId: z.string(),
    totalKg: z.number(),
    pickups: z.number(),
    lastPickupOn: z.string().nullable(),
});

const round2 = (value: number): number => Math.round(value * 100) / 100;

function figures(totalKg: number, settings: SiteSettings) {
    return monthlyReportFigures(totalKg, goalKg(settings), settings.gramsPerCap, doseKg(settings));
}

function dateOrNull(date: Date | null | undefined): string | null {
    return date ? formatDateOnly(date) : null;
}

export async function pickupsRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/leaderboard',
        {
            schema: {
                tags: ['public'],
                querystring: z.object({ period: z.enum(PERIODS).default('month') }),
                response: { 200: leaderboardSchema },
            },
        },
        async (request, reply) => {
            await assertVisible(app.prisma, 'page.leaderboard');
            const period: Period = request.query.period;
            const since = periodStart(period, new Date());
            const where: Prisma.PickupWhereInput = {
                point: { status: 'ACTIVE' },
                ...(since ? { pickedUpOn: { gte: since } } : {}),
            };

            const [groups, settings] = await Promise.all([
                app.prisma.pickup.groupBy({
                    by: ['pointId'],
                    where,
                    _sum: { kg: true },
                    _count: { _all: true },
                    _max: { pickedUpOn: true },
                }),
                getSettings(app.prisma),
            ]);

            const points = await app.prisma.collectionPoint.findMany({
                where: { id: { in: groups.map((group) => group.pointId) } },
                include: { neighborhood: true },
            });
            const byId = new Map(points.map((point) => [point.id, point]));

            const entries = groups.flatMap((group) => {
                const point = byId.get(group.pointId);
                if (!point) return [];
                return [
                    {
                        pointId: point.id,
                        name: point.name,
                        neighborhood: point.neighborhood.name,
                        category: point.category,
                        totalKg: round2(Number(group._sum.kg ?? 0)),
                        pickups: group._count._all,
                        lastPickupOn: dateOrNull(group._max.pickedUpOn),
                    },
                ];
            });

            const totalKg = round2(entries.reduce((sum, entry) => sum + entry.totalKg, 0));
            const payload = {
                period,
                since: dateOrNull(since),
                totalKg,
                pickups: entries.reduce((sum, entry) => sum + entry.pickups, 0),
                pointCount: entries.length,
                ...figures(totalKg, settings),
                items: rankEntries(entries).slice(0, LEADERBOARD_LIMIT),
            };
            if (replyWithEtag(request, reply, payload, 60)) return reply;
            return payload;
        },
    );

    route.get(
        '/leaderboard/points/:id',
        {
            schema: {
                tags: ['public'],
                params: idParams,
                response: { 200: pointImpactSchema },
            },
        },
        async (request, reply) => {
            await assertVisible(app.prisma, 'page.leaderboard');
            const point = await app.prisma.collectionPoint.findUnique({
                where: { id: request.params.id },
                include: { neighborhood: true },
            });
            if (!point || point.status !== 'ACTIVE') {
                throw new NotFoundError('Collection point not found');
            }

            const [totals, settings] = await Promise.all([
                app.prisma.pickup.aggregate({
                    where: { pointId: point.id },
                    _sum: { kg: true },
                    _count: { _all: true },
                    _min: { pickedUpOn: true },
                    _max: { pickedUpOn: true },
                }),
                getSettings(app.prisma),
            ]);

            const totalKg = round2(Number(totals._sum.kg ?? 0));
            const payload = {
                point: {
                    id: point.id,
                    name: point.name,
                    neighborhood: point.neighborhood.name,
                    category: point.category,
                },
                totalKg,
                pickups: totals._count._all,
                firstPickupOn: dateOrNull(totals._min.pickedUpOn),
                lastPickupOn: dateOrNull(totals._max.pickedUpOn),
                ...figures(totalKg, settings),
            };
            if (replyWithEtag(request, reply, payload, 60)) return reply;
            return payload;
        },
    );

    const tags = ['admin: pickups'];
    const guard = { onRequest: app.requireAuth };

    route.get(
        '/admin/pickups',
        {
            ...guard,
            schema: {
                tags,
                querystring: paginationQuery.extend({ pointId: z.uuid().optional() }),
                response: {
                    200: z.object({
                        items: z.array(adminPickupSchema),
                        meta: paginationMetaSchema,
                    }),
                },
            },
        },
        async (request) => {
            const { page, pageSize, pointId } = request.query;
            const where: Prisma.PickupWhereInput = pointId ? { pointId } : {};
            const [rows, total] = await Promise.all([
                app.prisma.pickup.findMany({
                    where,
                    include: { point: { select: { name: true } } },
                    orderBy: [{ pickedUpOn: 'desc' }, { createdAt: 'desc' }],
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                app.prisma.pickup.count({ where }),
            ]);
            return {
                items: rows.map((row) => ({
                    id: row.id,
                    pointId: row.pointId,
                    pointName: row.point.name,
                    pickedUpOn: formatDateOnly(row.pickedUpOn),
                    kg: Number(row.kg),
                    bags: row.bags,
                    bagLiters: row.bagLiters,
                    createdAt: iso(row.createdAt),
                })),
                meta: paginationMeta(page, pageSize, total),
            };
        },
    );

    route.get(
        '/admin/pickups/summary',
        {
            ...guard,
            schema: { tags, response: { 200: z.object({ items: z.array(pickupSummarySchema) }) } },
        },
        async () => {
            const groups = await app.prisma.pickup.groupBy({
                by: ['pointId'],
                _sum: { kg: true },
                _count: { _all: true },
                _max: { pickedUpOn: true },
            });
            return {
                items: groups.map((group) => ({
                    pointId: group.pointId,
                    totalKg: round2(Number(group._sum.kg ?? 0)),
                    pickups: group._count._all,
                    lastPickupOn: dateOrNull(group._max.pickedUpOn),
                })),
            };
        },
    );

    route.post(
        '/admin/pickups',
        {
            ...guard,
            schema: {
                tags,
                body: z.strictObject({
                    pointId: z.uuid(),
                    kg: z.number().positive().max(MAX_PICKUP_KG).optional(),
                    bags: z.number().int().positive().max(1000).optional(),
                    bagLiters: z.number().int().positive().max(1000).optional(),
                    pickedUpOn: dateField.optional(),
                }),
                response: { 201: adminPickupSchema },
            },
        },
        async (request, reply) => {
            const { pointId, bags, bagLiters } = request.body;
            if (request.body.kg === undefined && (bags === undefined || bagLiters === undefined)) {
                throw new ValidationError('Inform the weight or the bags', [
                    { path: 'kg', message: 'Inform kg, or bags with their size in liters' },
                ]);
            }
            const today = brazilToday(new Date());
            const pickedUpOn = request.body.pickedUpOn ?? today;
            if (pickedUpOn > today) {
                throw new ValidationError('The pickup date cannot be in the future', [
                    { path: 'pickedUpOn', message: 'Choose today or an earlier date' },
                ]);
            }

            const point = await app.prisma.collectionPoint.findUnique({ where: { id: pointId } });
            if (!point || point.status !== 'ACTIVE') {
                throw new NotFoundError('Collection point not found');
            }

            const kg =
                request.body.kg ??
                estimateKgFromBags(
                    bags as number,
                    bagLiters as number,
                    (await getSettings(app.prisma)).kgPer100LBag,
                );
            if (kg > MAX_PICKUP_KG) {
                throw new ValidationError('The weight is too high', [
                    { path: 'bags', message: 'Estimated weight is above the allowed limit' },
                ]);
            }
            const created = await app.prisma.pickup.create({
                data: {
                    pointId,
                    kg,
                    bags: bags ?? null,
                    bagLiters: bagLiters ?? null,
                    pickedUpOn: dateOnly(pickedUpOn),
                    createdById: request.user?.id ?? null,
                },
            });
            return reply.code(201).send({
                id: created.id,
                pointId: created.pointId,
                pointName: point.name,
                pickedUpOn,
                kg: Number(created.kg),
                bags: created.bags,
                bagLiters: created.bagLiters,
                createdAt: iso(created.createdAt),
            });
        },
    );

    route.delete(
        '/admin/pickups/:id',
        { ...guard, schema: { tags, params: idParams } },
        async (request, reply) => {
            const existing = await app.prisma.pickup.findUnique({
                where: { id: request.params.id },
            });
            if (!existing) throw new NotFoundError('Pickup not found');

            const user = request.user;
            const ownRecentEntry =
                existing.createdById !== null &&
                existing.createdById === user?.id &&
                Date.now() - existing.createdAt.getTime() < EDITOR_DELETE_WINDOW_MS;
            if (user?.role !== 'ADMIN' && !ownRecentEntry) {
                throw new ForbiddenError(
                    'Only an administrator can delete an older pickup or one from someone else',
                );
            }

            await app.prisma.pickup.delete({ where: { id: existing.id } });
            request.log.info(
                { pickupId: existing.id, pointId: existing.pointId, userId: user?.id },
                'pickup deleted',
            );
            return reply.code(204).send();
        },
    );
}
