import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, captureLogs } from '../../test/helpers/build-test-app';

let app: FastifyInstance | undefined;

afterEach(async () => {
    await app?.close();
    app = undefined;
});

describe('log redaction', () => {
    it('never writes cookies or personal data to the log', async () => {
        const logs = captureLogs();
        app = await buildTestApp({ LOG_LEVEL: 'info' }, logs);
        app.post('/test/log', async (request) => {
            request.log.info(
                {
                    body: request.body,
                    req: { headers: request.headers },
                    user: { email: 'ana@example.com' },
                },
                'received',
            );
            return { ok: true };
        });
        await app.ready();

        await app.inject({
            method: 'POST',
            url: '/test/log',
            headers: { cookie: 'session=abc123' },
            payload: { requesterName: 'Maria Souza', contact: '47999990000' },
        });

        const output = logs.lines.join('');
        expect(output).toContain('received');
        expect(output).toContain('[Redacted]');
        for (const secret of ['abc123', 'Maria Souza', '47999990000', 'ana@example.com']) {
            expect(output).not.toContain(secret);
        }
    });
});
