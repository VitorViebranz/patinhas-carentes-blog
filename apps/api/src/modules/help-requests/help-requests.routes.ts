import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Env } from '../../config/env';
import type { HelpRequest } from '../../generated/prisma/client';
import { compact } from '../../lib/compact';
import { iso, isoOrNull } from '../../lib/dates';
import { NotFoundError } from '../../lib/errors';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';
import { optionalText } from '../collection-points/point.schemas';
import { assertVisible } from '../features/features.service';

interface Options {
    env: Env;
}

const typeSchema = z.enum(['COLLECTION_POINT', 'FOSTER', 'TALK']);
const institutionTypeSchema = z.enum(['SCHOOL', 'COMPANY', 'STORE', 'CONDO']);
const statusSchema = z.enum(['NEW', 'ANSWERED']);

const contactField = z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine(
        (value) => z.email().safeParse(value).success || /^\+?[\d\s().-]{10,20}$/.test(value),
        'Enter a valid WhatsApp number or e-mail',
    );

const createBody = z
    .strictObject({
        type: typeSchema,
        requesterName: z.string().trim().min(2).max(120),
        contact: contactField,
        institutionName: optionalText(160),
        institutionType: institutionTypeSchema.optional(),
        wantsTalk: z.boolean().optional(),
        animalCapacity: z.number().int().min(1).max(100).optional(),
        message: optionalText(1000),
        postalCode: z
            .string()
            .trim()
            .regex(/^\d{5}-?\d{3}$/, 'Invalid postal code')
            .optional(),
        address: optionalText(200),
        neighborhoodName: optionalText(100),
        consent: z.literal(true, { error: 'Consent is required' }),

        website: z.string().max(200).optional(),
    })
    .superRefine((value, context) => {
        if (value.type !== 'FOSTER' && !value.institutionName) {
            context.addIssue({
                code: 'custom',
                path: ['institutionName'],
                message: 'Institution name is required for this kind of request',
            });
        }
    });

const adminRequestSchema = z.object({
    id: z.string(),
    type: typeSchema,
    requesterName: z.string(),
    contact: z.string(),
    institutionName: z.string().nullable(),
    institutionType: institutionTypeSchema.nullable(),
    wantsTalk: z.boolean(),
    animalCapacity: z.number().nullable(),
    message: z.string().nullable(),
    postalCode: z.string().nullable(),
    address: z.string().nullable(),
    neighborhoodName: z.string().nullable(),
    status: statusSchema,
    consentGivenAt: z.string(),
    answeredAt: z.string().nullable(),
    createdAt: z.string(),
});

function toDto(request: HelpRequest): z.infer<typeof adminRequestSchema> {
    return {
        id: request.id,
        type: request.type,
        requesterName: request.requesterName,
        contact: request.contact,
        institutionName: request.institutionName,
        institutionType: request.institutionType,
        wantsTalk: request.wantsTalk,
        animalCapacity: request.animalCapacity,
        message: request.message,
        postalCode: request.postalCode,
        address: request.address,
        neighborhoodName: request.neighborhoodName,
        status: request.status,
        consentGivenAt: iso(request.consentGivenAt),
        answeredAt: isoOrNull(request.answeredAt),
        createdAt: iso(request.createdAt),
    };
}

const idParams = z.object({ id: z.uuid() });

export async function helpRequestsRoutes(app: FastifyInstance, options: Options): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.post(
        '/help-requests',
        {
            config: {
                rateLimit: { max: options.env.HELP_REQUEST_RATE_LIMIT_MAX, timeWindow: '1 hour' },
            },
            schema: {
                tags: ['public'],
                body: createBody,
                response: { 201: z.object({ status: z.literal('received') }) },
            },
        },
        async (request, reply) => {
            const { website, ...data } = request.body;

            if (website) return reply.code(201).send({ status: 'received' as const });

            await assertVisible(app.prisma, data.type === 'FOSTER' ? 'page.help' : 'page.school');

            await app.prisma.helpRequest.create({
                data: {
                    ...compact({
                        institutionName: data.institutionName,
                        institutionType: data.institutionType,
                        wantsTalk: data.wantsTalk,
                        animalCapacity: data.animalCapacity,
                        message: data.message,
                        postalCode: data.postalCode,
                        address: data.address,
                        neighborhoodName: data.neighborhoodName,
                    }),
                    type: data.type,
                    requesterName: data.requesterName,
                    contact: data.contact,
                    consentGivenAt: new Date(),
                },
            });
            return reply.code(201).send({ status: 'received' as const });
        },
    );

    const tags = ['admin: help requests'];
    const guard = { onRequest: app.requireAuth };

    route.get(
        '/admin/help-requests',
        {
            ...guard,
            schema: {
                tags,
                querystring: paginationQuery.extend({
                    status: statusSchema.optional(),
                    type: typeSchema.optional(),
                }),
                response: {
                    200: z.object({
                        items: z.array(adminRequestSchema),
                        meta: paginationMetaSchema,
                    }),
                },
            },
        },
        async (request) => {
            const { page, pageSize, status, type } = request.query;
            const where = { ...(status ? { status } : {}), ...(type ? { type } : {}) };
            const [items, total] = await Promise.all([
                app.prisma.helpRequest.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                app.prisma.helpRequest.count({ where }),
            ]);
            return { items: items.map(toDto), meta: paginationMeta(page, pageSize, total) };
        },
    );

    route.patch(
        '/admin/help-requests/:id',
        {
            ...guard,
            schema: {
                tags,
                params: idParams,
                body: z.strictObject({ status: statusSchema }),
                response: { 200: adminRequestSchema },
            },
        },
        async (request) => {
            const existing = await app.prisma.helpRequest.findUnique({
                where: { id: request.params.id },
            });
            if (!existing) throw new NotFoundError('Help request not found');

            const answered = request.body.status === 'ANSWERED';
            const updated = await app.prisma.helpRequest.update({
                where: { id: existing.id },
                data: {
                    status: request.body.status,
                    answeredAt: answered ? new Date() : null,
                    answeredById: answered ? (request.user?.id ?? null) : null,
                },
            });
            return toDto(updated);
        },
    );

    route.delete(
        '/admin/help-requests/:id',
        { onRequest: app.requireAdmin, schema: { tags, params: idParams } },
        async (request, reply) => {
            const existing = await app.prisma.helpRequest.findUnique({
                where: { id: request.params.id },
            });
            if (!existing) throw new NotFoundError('Help request not found');
            await app.prisma.helpRequest.delete({ where: { id: existing.id } });
            return reply.code(204).send();
        },
    );
}
