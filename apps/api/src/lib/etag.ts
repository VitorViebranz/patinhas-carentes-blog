import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export function replyWithEtag(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: unknown,
    maxAgeSeconds = 60,
): boolean {
    const etag = `"${createHash('sha1').update(JSON.stringify(payload)).digest('base64url')}"`;
    void reply.header('etag', etag).header('cache-control', `public, max-age=${maxAgeSeconds}`);
    if (request.headers['if-none-match'] === etag) {
        void reply.code(304).send();
        return true;
    }
    return false;
}
