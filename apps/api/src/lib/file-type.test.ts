import { describe, expect, it } from 'vitest';
import { detectImageType } from './file-type';

describe('detectImageType', () => {
    it('recognizes jpeg, png and webp by content', () => {
        expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg');
        expect(
            detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])),
        ).toBe('image/png');
        expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'binary'))).toBe('image/webp');
    });

    it('rejects other content, even if it claims to be an image', () => {
        expect(
            detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
        ).toBeNull();
        expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
        expect(detectImageType(Buffer.alloc(0))).toBeNull();
    });
});
