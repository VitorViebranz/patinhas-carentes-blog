import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
    password: string,
    salt: Buffer,
    keylen: number,
    options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const TEST_COST = 16_384;
const PRODUCTION_COST = 131_072;
const PARAMS = {
    N: process.env['NODE_ENV'] === 'test' ? TEST_COST : PRODUCTION_COST,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024,
};
const KEY_LENGTH = 64;
const FORMAT = 'scrypt';

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
    return [
        FORMAT,
        PARAMS.N,
        PARAMS.r,
        PARAMS.p,
        salt.toString('base64url'),
        key.toString('base64url'),
    ].join('$');
}

export function needsRehash(stored: string): boolean {
    const [format, n] = stored.split('$');
    return format === FORMAT && Number(n) < PARAMS.N;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [format, n, r, p, saltText, hashText] = stored.split('$');
    if (format !== FORMAT || !n || !r || !p || !saltText || !hashText) return false;

    const expected = Buffer.from(hashText, 'base64url');
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: PARAMS.maxmem,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const DUMMY_HASH_PROMISE = hashPassword('dummy-password-for-timing');
