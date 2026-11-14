import { describe, expect, it } from 'vitest';
import { hashPassword, needsRehash, verifyPassword } from './password';

describe('password hashing', () => {
    it('accepts the right password and rejects a wrong one', async () => {
        const hash = await hashPassword('correct horse battery');

        expect(await verifyPassword('correct horse battery', hash)).toBe(true);
        expect(await verifyPassword('wrong password', hash)).toBe(false);
    });

    it('uses a unique salt, so equal passwords get different hashes', async () => {
        const [a, b] = await Promise.all([
            hashPassword('same-password-1'),
            hashPassword('same-password-1'),
        ]);

        expect(a).not.toBe(b);
    });

    it('never stores the password in the hash', async () => {
        expect(await hashPassword('plain-text-password')).not.toContain('plain-text-password');
    });

    it('rejects malformed stored hashes instead of throwing', async () => {
        expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    });

    it('asks for a new hash only when the stored cost is lower than the current one', async () => {
        expect(needsRehash('scrypt$1024$8$1$salt$key')).toBe(true);
        expect(needsRehash(await hashPassword('current-cost-password'))).toBe(false);
        expect(needsRehash('not-a-hash')).toBe(false);
    });
});
