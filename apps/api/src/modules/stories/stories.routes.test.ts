import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../../../test/helpers/build-test-app';
import { call, createAndLogin, resetDatabase } from '../../../test/helpers/kit';

interface StoryBody {
    id: string;
    title: string;
    slug: string;
    body: string;
    excerpt: string;
    status: string;
    coverUrl: string | null;
    publishedAt: string | null;
}

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
});
afterAll(async () => {
    await app.close();
});
beforeEach(async () => {
    await resetDatabase(app);
});

async function createStory(cookie: string, title: string, body = 'Texto da história.') {
    const response = await call(app, cookie, 'POST', '/api/v1/admin/stories', { title, body });
    return response.json<StoryBody>();
}

describe('admin stories', () => {
    it('requires a session', async () => {
        expect((await call(app, null, 'GET', '/api/v1/admin/stories')).statusCode).toBe(401);
    });

    it('creates a draft with a slug made from the title', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const story = await createStory(cookie, 'Oi, eu sou a Mel!');

        expect(story).toMatchObject({
            slug: 'oi-eu-sou-a-mel',
            status: 'DRAFT',
            publishedAt: null,
        });
    });

    it('keeps slugs unique and stable when the title changes', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const first = await createStory(cookie, 'Ninhada');
        const second = await createStory(cookie, 'Ninhada');

        const renamed = await call(app, cookie, 'PATCH', `/api/v1/admin/stories/${first.id}`, {
            title: 'Outro título',
        });

        expect(second.slug).toBe('ninhada-2');
        expect(renamed.json<StoryBody>().slug).toBe('ninhada');
    });

    it('rejects a missing title, a missing body and an unknown cover image', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');

        const noTitle = await call(app, cookie, 'POST', '/api/v1/admin/stories', { body: 'x' });
        const noBody = await call(app, cookie, 'POST', '/api/v1/admin/stories', { title: 'x' });
        const badCover = await call(app, cookie, 'POST', '/api/v1/admin/stories', {
            title: 'x',
            body: 'y',
            coverMediaId: '019a0000-0000-7000-8000-000000000000',
        });

        expect([noTitle.statusCode, noBody.statusCode, badCover.statusCode]).toEqual([
            400, 400, 400,
        ]);
    });

    it('deletes a story', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const story = await createStory(cookie, 'Apagar');

        const response = await call(app, cookie, 'DELETE', `/api/v1/admin/stories/${story.id}`);

        expect(response.statusCode).toBe(204);
        expect(await app.prisma.story.count()).toBe(0);
    });
});

describe('public stories', () => {
    it('hides drafts, shows published stories with an excerpt, and hides them when unpublished', async () => {
        const { cookie } = await createAndLogin(app, 'EDITOR');
        const draft = await createStory(cookie, 'Rascunho');
        const published = await createStory(cookie, 'Publicada', 'a'.repeat(400));
        await call(app, cookie, 'POST', `/api/v1/admin/stories/${published.id}/publish`);

        const list = await app.inject('/api/v1/stories');
        const detail = await app.inject(`/api/v1/stories/${published.slug}`);
        const draftDetail = await app.inject(`/api/v1/stories/${draft.slug}`);

        const items = list.json<{ items: StoryBody[] }>().items;
        expect(items.map((item) => item.slug)).toEqual(['publicada']);
        expect(items[0]?.excerpt.length).toBeLessThan(200);
        expect(items[0]).not.toHaveProperty('body');
        expect(detail.json<StoryBody>().body).toHaveLength(400);
        expect(detail.json<StoryBody>().publishedAt).not.toBeNull();
        expect(draftDetail.statusCode).toBe(404);

        await call(app, cookie, 'POST', `/api/v1/admin/stories/${published.id}/unpublish`);
        expect((await app.inject(`/api/v1/stories/${published.slug}`)).statusCode).toBe(404);
    });

    it('returns 404 for an unknown slug', async () => {
        expect((await app.inject('/api/v1/stories/nao-existe')).statusCode).toBe(404);
    });
});
