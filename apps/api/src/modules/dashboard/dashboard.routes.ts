import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { previousMonth } from '../../lib/months';

const dashboardSchema = z.object({
    activePoints: z.number(),
    newHelpRequests: z.number(),
    pointsWithoutPhone: z.number(),
    approximateLocationPoints: z.number(),
    pendingReport: z.object({
        month: z.string(),
        status: z.enum(['MISSING', 'DRAFT', 'PUBLISHED']),
    }),
});

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/admin/dashboard',
        {
            onRequest: app.requireAuth,
            schema: { tags: ['admin: dashboard'], response: { 200: dashboardSchema } },
        },
        async () => {
            const month = previousMonth(new Date());
            const active = { status: 'ACTIVE' as const };
            const [
                activePoints,
                newHelpRequests,
                pointsWithoutPhone,
                approximateLocationPoints,
                report,
            ] = await Promise.all([
                app.prisma.collectionPoint.count({ where: active }),
                app.prisma.helpRequest.count({ where: { status: 'NEW' } }),
                app.prisma.collectionPoint.count({
                    where: { ...active, OR: [{ phone: null }, { phone: '' }] },
                }),
                app.prisma.collectionPoint.count({
                    where: { ...active, locationPrecision: 'NEIGHBORHOOD' },
                }),
                app.prisma.monthlyReport.findUnique({ where: { month } }),
            ]);

            return {
                activePoints,
                newHelpRequests,
                pointsWithoutPhone,
                approximateLocationPoints,
                pendingReport: { month, status: report ? report.status : ('MISSING' as const) },
            };
        },
    );
}
