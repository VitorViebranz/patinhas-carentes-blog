import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
    it('returns the JSON body of a successful response', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(new Response(JSON.stringify({ items: [1] }), { status: 200 })),
        );

        await expect(apiRequest('/collection-points')).resolves.toEqual({ items: [1] });
    });

    it('asks again ignoring the cache when the browser hands over a bare 304', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 304 }))
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ items: [1, 2] }), { status: 200 }),
            );
        vi.stubGlobal('fetch', fetchMock);

        const data = await apiRequest<{ items: number[] }>('/collection-points');

        expect(data.items).toEqual([1, 2]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [, retry] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(retry.cache).toBe('reload');
    });

    it('turns an API error body into an ApiError', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Nope' } }),
                        { status: 404 },
                    ),
                ),
        );

        await expect(apiRequest('/x')).rejects.toMatchObject({
            status: 404,
            code: 'NOT_FOUND',
        });
    });

    it('reports a network failure in Portuguese', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));

        const attempt = apiRequest('/x');

        await expect(attempt).rejects.toBeInstanceOf(ApiError);
        await expect(attempt).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    });
});
