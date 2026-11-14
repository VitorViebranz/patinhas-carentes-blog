import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ORIGIN, TEST_UPLOAD_DIR, buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, resetDatabase } from '../../../test/helpers/kit';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngBytes = (size = 64) => Buffer.concat([PNG_HEADER, Buffer.alloc(size - PNG_HEADER.length)]);

interface MediaBody {
    id: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    altText: string;
}

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp({ UPLOAD_MAX_BYTES: '1024' });
    await app.ready();
});
afterAll(async () => {
    await app.close();
    await rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
});
beforeEach(async () => {
    await resetDatabase(app);
});

function upload(
    cookie: string | null,
    file: { name: string; type: string; content: Buffer } | null,
    altText?: string,
) {
    const boundary = '----patinhas-test-boundary';
    const chunks: Buffer[] = [];
    if (altText !== undefined) {
        chunks.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="altText"\r\n\r\n${altText}\r\n`,
            ),
        );
    }
    if (file) {
        chunks.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`,
            ),
            file.content,
            Buffer.from('\r\n'),
        );
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));

    return app.inject({
        method: 'POST',
        url: '/api/v1/admin/media',
        headers: {
            origin: ORIGIN,
            'content-type': `multipart/form-data; boundary=${boundary}`,
            ...(cookie ? { cookie } : {}),
        },
        payload: Buffer.concat(chunks),
    });
}

describe('POST /admin/media', () => {
    it('requires a session', async () => {
        const response = await upload(null, {
            name: 'a.png',
            type: 'image/png',
            content: pngBytes(),
        });

        expect(response.statusCode).toBe(401);
    });

    it('stores a valid image under a generated name and serves it publicly', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const response = await upload(
            cookie,
            { name: '../../evil name.png', type: 'image/png', content: pngBytes() },
            'Uma gatinha',
        );

        expect(response.statusCode).toBe(201);
        const media = response.json<MediaBody>();
        expect(media).toMatchObject({
            mimeType: 'image/png',
            sizeBytes: 64,
            altText: 'Uma gatinha',
        });
        const stored = await app.prisma.mediaFile.findUniqueOrThrow({ where: { id: media.id } });
        expect(stored.path).toMatch(/^[0-9a-f-]{36}\.png$/);
        expect(existsSync(path.join(TEST_UPLOAD_DIR, stored.path))).toBe(true);

        const served = await app.inject(media.url);
        expect(served.statusCode).toBe(200);
        expect(served.headers['content-type']).toBe('image/png');
        expect(served.rawPayload.equals(pngBytes())).toBe(true);
    });

    it('decides the type from the content, ignoring the name and the declared type', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const script = await upload(cookie, {
            name: 'photo.png',
            type: 'image/png',
            content: Buffer.from('<script>alert(1)</script>'),
        });
        const svg = await upload(cookie, {
            name: 'x.svg',
            type: 'image/svg+xml',
            content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        });

        expect(script.statusCode).toBe(400);
        expect(svg.statusCode).toBe(400);
        expect(await app.prisma.mediaFile.count()).toBe(0);
    });

    it('rejects a request without file and a file over the size limit', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const none = await upload(cookie, null, 'sem arquivo');
        const big = await upload(cookie, {
            name: 'big.png',
            type: 'image/png',
            content: pngBytes(4096),
        });

        expect(none.statusCode).toBe(400);
        expect(big.statusCode).toBe(413);
        expect(await app.prisma.mediaFile.count()).toBe(0);
    });
});

describe('GET and DELETE media', () => {
    it('returns 404 for an unknown id', async () => {
        const response = await app.inject('/api/v1/media/019a0000-0000-7000-8000-000000000000');

        expect(response.statusCode).toBe(404);
    });

    it('deletes the row and the file', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const media = (
            await upload(cookie, { name: 'a.png', type: 'image/png', content: pngBytes() })
        ).json<MediaBody>();
        const stored = await app.prisma.mediaFile.findUniqueOrThrow({ where: { id: media.id } });

        const response = await call(app, cookie, 'DELETE', `/api/v1/admin/media/${media.id}`);

        expect(response.statusCode).toBe(204);
        expect(existsSync(path.join(TEST_UPLOAD_DIR, stored.path))).toBe(false);
        expect((await app.inject(media.url)).statusCode).toBe(404);
    });

    it('refuses to delete an image that a story uses', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const media = (
            await upload(cookie, { name: 'a.png', type: 'image/png', content: pngBytes() })
        ).json<MediaBody>();
        await call(app, cookie, 'POST', '/api/v1/admin/stories', {
            title: 'Com capa',
            body: 'x',
            coverMediaId: media.id,
        });

        const response = await call(app, cookie, 'DELETE', `/api/v1/admin/media/${media.id}`);

        expect(response.statusCode).toBe(409);
    });

    it('shows the cover of a published story on the public API', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const media = (
            await upload(cookie, { name: 'a.png', type: 'image/png', content: pngBytes() }, 'Mel')
        ).json<MediaBody>();
        const story = (
            await call(app, cookie, 'POST', '/api/v1/admin/stories', {
                title: 'Com capa',
                body: 'x',
                coverMediaId: media.id,
            })
        ).json<{ id: string }>();
        await call(app, cookie, 'POST', `/api/v1/admin/stories/${story.id}/publish`);

        const list = await app.inject('/api/v1/stories');

        expect(
            list.json<{ items: { coverUrl: string; coverAlt: string }[] }>().items[0],
        ).toMatchObject({
            coverUrl: media.url,
            coverAlt: 'Mel',
        });
    });
});
