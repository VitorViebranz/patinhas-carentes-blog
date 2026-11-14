import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Env } from '../../config/env';
import type { MediaFile } from '../../generated/prisma/client';
import { iso } from '../../lib/dates';
import { detectImageType, extensionFor } from '../../lib/file-type';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import { paginationMeta, paginationMetaSchema, paginationQuery } from '../../lib/pagination';

interface Options {
    env: Env;
}

const idParams = z.object({ id: z.uuid() });

const mediaSchema = z.object({
    id: z.string(),
    url: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    altText: z.string(),
    createdAt: z.string(),
});

function toDto(media: MediaFile): z.infer<typeof mediaSchema> {
    return {
        id: media.id,
        url: `/api/v1/media/${media.id}`,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        altText: media.altText,
        createdAt: iso(media.createdAt),
    };
}

export async function mediaRoutes(app: FastifyInstance, options: Options): Promise<void> {
    const { env } = options;
    const route = app.withTypeProvider<ZodTypeProvider>();

    const uploadDir = path.resolve(env.UPLOAD_DIR);

    await app.register(multipart, {
        limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1, fields: 4 },
    });

    route.get(
        '/media/:id',
        { schema: { tags: ['public'], params: idParams } },
        async (request, reply) => {
            const media = await app.prisma.mediaFile.findUnique({
                where: { id: request.params.id },
            });
            if (!media) throw new NotFoundError('Media not found');

            const file = path.join(uploadDir, path.basename(media.path));
            const stream = createReadStream(file);
            await new Promise<void>((resolve, reject) => {
                stream.once('open', () => resolve());
                stream.once('error', reject);
            }).catch(() => {
                throw new NotFoundError('Media file missing');
            });
            return reply
                .header('content-type', media.mimeType)
                .header('content-length', media.sizeBytes)
                .header('cache-control', 'public, max-age=31536000, immutable')
                .send(stream);
        },
    );

    const tags = ['admin: media'];
    const guard = { onRequest: app.requireAuth };

    route.get(
        '/admin/media',
        {
            ...guard,
            schema: {
                tags,
                querystring: paginationQuery,
                response: {
                    200: z.object({ items: z.array(mediaSchema), meta: paginationMetaSchema }),
                },
            },
        },
        async (request) => {
            const { page, pageSize } = request.query;
            const [items, total] = await Promise.all([
                app.prisma.mediaFile.findMany({
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                app.prisma.mediaFile.count(),
            ]);
            return { items: items.map(toDto), meta: paginationMeta(page, pageSize, total) };
        },
    );

    route.post(
        '/admin/media',
        { ...guard, schema: { tags, response: { 201: mediaSchema } } },
        async (request, reply) => {
            let content: Buffer | null = null;
            let altText = '';

            for await (const part of request.parts()) {
                if (part.type === 'file') {
                    if (part.fieldname === 'file' && content === null)
                        content = await part.toBuffer();
                    else await part.toBuffer();
                } else if (part.fieldname === 'altText' && typeof part.value === 'string') {
                    altText = part.value.trim().slice(0, 200);
                }
            }

            if (!content || content.length === 0) {
                throw new ValidationError('Send the image in the "file" field', [
                    { path: 'file', message: 'Required' },
                ]);
            }

            const mime = detectImageType(content);
            if (!mime) {
                throw new ValidationError('Only JPEG, PNG or WebP images are allowed', [
                    { path: 'file', message: 'Unsupported file type' },
                ]);
            }

            const fileName = `${randomUUID()}.${extensionFor(mime)}`;
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, fileName), content, { flag: 'wx' });

            const created = await app.prisma.mediaFile
                .create({
                    data: {
                        path: fileName,
                        mimeType: mime,
                        sizeBytes: content.length,
                        altText,
                        uploadedById: request.user?.id ?? null,
                    },
                })
                .catch(async (error: unknown) => {
                    await unlink(path.join(uploadDir, fileName)).catch(() => undefined);
                    throw error;
                });
            return reply.code(201).send(toDto(created));
        },
    );

    route.delete(
        '/admin/media/:id',
        { ...guard, schema: { tags, params: idParams } },
        async (request, reply) => {
            const media = await app.prisma.mediaFile.findUnique({
                where: { id: request.params.id },
                include: { _count: { select: { stories: true } } },
            });
            if (!media) throw new NotFoundError('Media not found');
            if (media._count.stories > 0) {
                throw new ConflictError(
                    'This image is used by a story. Remove it from the story first.',
                );
            }
            await app.prisma.mediaFile.delete({ where: { id: media.id } });
            await unlink(path.join(uploadDir, path.basename(media.path))).catch(() => undefined);
            return reply.code(204).send();
        },
    );
}
