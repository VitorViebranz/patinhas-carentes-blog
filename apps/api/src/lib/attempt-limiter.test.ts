import { describe, expect, it } from 'vitest';
import { AttemptLimiter } from './attempt-limiter';

describe('AttemptLimiter', () => {
    it('blocks after the maximum within the window', () => {
        const limiter = new AttemptLimiter(2, 1000);

        expect([limiter.allow('a', 0), limiter.allow('a', 10), limiter.allow('a', 20)]).toEqual([
            true,
            true,
            false,
        ]);
    });

    it('keeps keys separate and forgets old attempts', () => {
        const limiter = new AttemptLimiter(1, 1000);

        limiter.allow('a', 0);

        expect(limiter.allow('b', 10)).toBe(true);
        expect(limiter.allow('a', 1500)).toBe(true);
    });

    it('drops the oldest keys instead of growing without limit', () => {
        const limiter = new AttemptLimiter(1, 60_000);
        limiter.allow('first', 0);

        for (let i = 0; i < 10_001; i += 1) limiter.allow(`other-${i}`, 1);

        expect(limiter.allow('first', 2)).toBe(true);
    });

    it('can be reset after a successful login', () => {
        const limiter = new AttemptLimiter(1, 1000);
        limiter.allow('a', 0);

        limiter.reset('a');

        expect(limiter.allow('a', 1)).toBe(true);
    });
});
