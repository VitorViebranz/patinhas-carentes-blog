import { slugify } from '@patinhas/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { MediaFile, PrismaClient, Story } from '../../generated/prisma/client';
import { compact } from '../../lib/compact';
import { iso, isoOrNull } from '../../lib/dates';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';
import { assertVisible } from '../features/features.service';

type StoryWithCover = Story & { coverMedia: MediaFile | null };

const EXCERPT_LENGTH = 180;
const idParams = z.object({ id: z.uuid() });

const summarySchema = z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string(),
    coverUrl: z.string().nullable(),
    coverAlt: z.string().nullable(),
    publishedAt: z.string().nullable(),
});
const publicDetailSchema = summarySchema.extend({ body: z.string() });
const adminStorySchema = publicDetailSchema.extend({
    status: z.enum(['DRAFT', 'PUBLISHED']),
    coverMediaId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

function excerptOf(body: string): string {
    const flat = body.replace(/\s+/g, ' ').trim();
    return flat.length <= EXCERPT_LENGTH ? flat : `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

function toSummary(story: StoryWithCover): z.infer<typeof summarySchema> {
    return {
        id: story.id,
        title: story.title,
        slug: story.slug,
        excerpt: excerptOf(story.body),
        coverUrl: story.coverMedia ? `/api/v1/media/${story.coverMedia.id}` : null,
        coverAlt: story.coverMedia?.altText ?? null,
        publishedAt: isoOrNull(story.publishedAt),
    };
}

function toAdminDto(story: StoryWithCover): z.infer<typeof adminStorySchema> {
    return {
        ...toSummary(story),
        body: story.body,
        status: story.status,
        coverMediaId: story.coverMediaId,
        createdAt: iso(story.createdAt),
        updatedAt: iso(story.updatedAt),
    };
}

async function uniqueSlug(prisma: PrismaClient, title: string): Promise<string> {
    const base = slugify(title) || 'historia';
    for (let suffix = 1; ; suffix += 1) {
        const candidate = suffix === 1 ? base : `${base}-${suffix}`;
        if (!(await prisma.story.findUnique({ where: { slug: candidate } }))) return candidate;
    }
}

export async function storiesRoutes(app: FastifyInstance): Promise<void> {
    const route = app.withTypeProvider<ZodTypeProvider>();

    route.get(
        '/stories',
        {
            schema: {
                tags: ['public'],
                response: { 200: z.object({ items: z.array(summarySchema) }) },
            },
        },
        async () => {
            await assertVisible(app.prisma, 'page.stories');
            const stories = await app.prisma.story.findMany({
                where: { status: 'PUBLISHED' },
                include: { coverMedia: true },
                orderBy: { publishedAt: 'desc' },
            });
            return { items: stories.map(toSummary) };
        },
    );

    route.get(
        '/stories/:slug',
        {
            schema: {
                tags: ['public'],
                params: z.object({ slug: z.string().min(1).max(120) }),
                response: { 200: publicDetailSchema },
            },
        },
        async (request) => {
            await assertVisible(app.prisma, 'page.stories');
            const story = await app.prisma.story.findUnique({
                where: { slug: request.params.slug },
                include: { coverMedia: true },
            });
            if (!story || story.status !== 'PUBLISHED') throw new NotFoundError('Story not found');
            return { ...toSummary(story), body: story.body };
        },
    );

    const tags = ['admin: stories'];
    const guard = { onRequest: app.requireAuth };

    async function load(id: string): Promise<StoryWithCover> {
        const story = await app.prisma.story.findUnique({
            where: { id },
            include: { coverMedia: true },
        });
        if (!story) throw new NotFoundError('Story not found');
        return story;
    }

    async function assertMediaExists(id: string): Promise<void> {
        if (!(await app.prisma.mediaFile.findUnique({ where: { id } }))) {
            throw new ValidationError('Invalid cover image', [
                { path: 'coverMediaId', message: 'Media file not found' },
            ]);
        }
    }

    route.get(
        '/admin/stories',
        {
            ...guard,
            schema: {
                tags,
                querystring: paginationQuery.extend({
                    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
                }),
                response: {
                    200: z.object({ items: z.array(adminStorySchema), meta: paginationMetaSchema }),
                },
            },
        },
        async (request) => {
            const { page, pageSize, status } = request.query;
            const where = status ? { status } : {};
            const [stories, total] = await Promise.all([
                app.prisma.story.findMany({
                    where,
                    include: { coverMedia: true },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                app.prisma.story.count({ where }),
            ]);
            return { items: stories.map(toAdminDto), meta: paginationMeta(page, pageSize, total) };
        },
    );

    route.get(
        '/admin/stories/:id',
        { ...guard, schema: { tags, params: idParams, response: { 200: adminStorySchema } } },
        async (request) => toAdminDto(await load(request.params.id)),
    );

    route.post(
        '/admin/stories',
        {
            ...guard,
            schema: {
                tags,
                body: z.strictObject({
                    title: z.string().trim().min(1).max(160),
                    body: z.string().trim().min(1).max(20_000),
                    coverMediaId: z.uuid().nullable().optional(),
                }),
                response: { 201: adminStorySchema },
            },
        },
        async (request, reply) => {
            const { title, body, coverMediaId } = request.body;
            if (coverMediaId) await assertMediaExists(coverMediaId);
            const created = await app.prisma.story.create({
                data: {
                    title,
                    body,
                    coverMediaId: coverMediaId ?? null,
                    slug: await uniqueSlug(app.prisma, title),
                },
                include: { coverMedia: true },
            });
            return reply.code(201).send(toAdminDto(created));
        },
    );

    route.patch(
        '/admin/stories/:id',
        {
            ...guard,
            schema: {
                tags,
                params: idParams,
                body: z.strictObject({
                    title: z.string().trim().min(1).max(160).optional(),
                    body: z.string().trim().min(1).max(20_000).optional(),
                    coverMediaId: z.uuid().nullable().optional(),
                }),
                response: { 200: adminStorySchema },
            },
        },
        async (request) => {
            const existing = await load(request.params.id);
            if (request.body.coverMediaId) await assertMediaExists(request.body.coverMediaId);
            const updated = await app.prisma.story.update({
                where: { id: existing.id },
                data: compact(request.body),
                include: { coverMedia: true },
            });
            return toAdminDto(updated);
        },
    );

    route.delete(
        '/admin/stories/:id',
        { ...guard, schema: { tags, params: idParams } },
        async (request, reply) => {
            const existing = await load(request.params.id);
            await app.prisma.story.delete({ where: { id: existing.id } });
            return reply.code(204).send();
        },
    );

    for (const [action, status] of [
        ['publish', 'PUBLISHED'],
        ['unpublish', 'DRAFT'],
    ] as const) {
        route.post(
            `/admin/stories/:id/${action}`,
            { ...guard, schema: { tags, params: idParams, response: { 200: adminStorySchema } } },
            async (request) => {
                const existing = await load(request.params.id);
                const updated = await app.prisma.story.update({
                    where: { id: existing.id },
                    data: {
                        status,
                        publishedAt:
                            status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
                    },
                    include: { coverMedia: true },
                });
                return toAdminDto(updated);
            },
        );
    }
}
