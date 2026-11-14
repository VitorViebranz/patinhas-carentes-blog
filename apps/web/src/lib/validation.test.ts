import { describe, expect, it } from 'vitest';
import { isValidContact } from './validation';

describe('isValidContact', () => {
    it('accepts phones and e-mails', () => {
        expect(isValidContact('(47) 99145-7757')).toBe(true);
        expect(isValidContact('47991457757')).toBe(true);
        expect(isValidContact('ana@example.com')).toBe(true);
    });
    it('rejects short or broken values', () => {
        expect(isValidContact('1234')).toBe(false);
        expect(isValidContact('ana@')).toBe(false);
        expect(isValidContact('')).toBe(false);
    });
});
