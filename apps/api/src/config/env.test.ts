import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const valid = {
    DATABASE_URL: 'postgresql://postgres@localhost:5432/patinhas',
    SESSION_SECRET: 'a-secret-that-is-at-least-32-characters-long',
};

describe('loadEnv', () => {
    it('applies defaults when only required variables are set', () => {
        const env = loadEnv(valid);

        expect(env.NODE_ENV).toBe('development');
        expect(env.PORT).toBe(3000);
        expect(env.TRUST_PROXY).toBe(false);
        expect(env.RATE_LIMIT_MAX).toBe(120);
    });

    it('coerces PORT and TRUST_PROXY from strings', () => {
        const env = loadEnv({ ...valid, PORT: '8080', TRUST_PROXY: 'true' });

        expect(env.PORT).toBe(8080);
        expect(env.TRUST_PROXY).toBe(true);
    });

    it('sends the session cookie only over HTTPS in production, unless overridden', () => {
        expect(loadEnv({ ...valid, NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
        expect(loadEnv(valid).COOKIE_SECURE).toBe(false);
        const overridden = loadEnv({ ...valid, NODE_ENV: 'production', COOKIE_SECURE: 'false' });
        expect(overridden.COOKIE_SECURE).toBe(false);
    });

    it('refuses the example SESSION_SECRET in production but not in development', () => {
        const example = 'change-me-to-a-long-random-string-with-32-plus-chars';

        expect(() =>
            loadEnv({ ...valid, NODE_ENV: 'production', SESSION_SECRET: example }),
        ).toThrow(/SESSION_SECRET/);
        expect(
            loadEnv({ ...valid, NODE_ENV: 'development', SESSION_SECRET: example }),
        ).toBeDefined();
    });

    it('accepts a real random secret in production', () => {
        expect(loadEnv({ ...valid, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    });

    it('throws naming DATABASE_URL when it is missing', () => {
        expect(() => loadEnv({ SESSION_SECRET: valid.SESSION_SECRET })).toThrow(/DATABASE_URL/);
    });

    it('throws when PORT is out of range', () => {
        expect(() => loadEnv({ ...valid, PORT: '70000' })).toThrow(/PORT/);
    });

    it('rejects a short SESSION_SECRET without printing its value', () => {
        const attempt = () => loadEnv({ ...valid, SESSION_SECRET: 'short-secret' });

        expect(attempt).toThrow(/SESSION_SECRET/);
        expect(attempt).not.toThrow(/short-secret/);
    });
});
