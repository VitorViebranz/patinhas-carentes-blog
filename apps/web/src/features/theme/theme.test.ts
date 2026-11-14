import { describe, expect, it, vi } from 'vitest';
import {
    THEME_STORAGE_KEY,
    parsePreference,
    readStoredPreference,
    resolveTheme,
    storePreference,
} from './theme';

describe('parsePreference', () => {
    it('keeps light and dark and treats anything else as automatic', () => {
        expect(parsePreference('light')).toBe('light');
        expect(parsePreference('dark')).toBe('dark');
        expect(parsePreference('system')).toBe('system');
        expect(parsePreference('azul')).toBe('system');
        expect(parsePreference(null)).toBe('system');
        expect(parsePreference(undefined)).toBe('system');
    });
});

describe('resolveTheme', () => {
    it('follows the system only when the preference is automatic', () => {
        expect(resolveTheme('system', true)).toBe('dark');
        expect(resolveTheme('system', false)).toBe('light');
    });

    it('obeys an explicit choice whatever the system says', () => {
        expect(resolveTheme('light', true)).toBe('light');
        expect(resolveTheme('dark', false)).toBe('dark');
    });
});

describe('readStoredPreference', () => {
    it('reads what was saved', () => {
        expect(readStoredPreference({ getItem: () => 'dark' })).toBe('dark');
    });

    it('falls back to automatic when nothing valid was saved', () => {
        expect(readStoredPreference({ getItem: () => null })).toBe('system');
        expect(readStoredPreference({ getItem: () => 'lixo' })).toBe('system');
    });

    it('does not break when the browser blocks storage', () => {
        const blocked = {
            getItem: () => {
                throw new Error('blocked');
            },
        };

        expect(readStoredPreference(blocked)).toBe('system');
    });
});

describe('storePreference', () => {
    it('saves an explicit choice under the site key', () => {
        const setItem = vi.fn();

        storePreference('dark', { setItem, removeItem: vi.fn() });

        expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    });

    it('forgets the saved value when going back to automatic', () => {
        const removeItem = vi.fn();
        const setItem = vi.fn();

        storePreference('system', { setItem, removeItem });

        expect(removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
        expect(setItem).not.toHaveBeenCalled();
    });

    it('does not break when the browser blocks storage', () => {
        const blocked = {
            setItem: () => {
                throw new Error('blocked');
            },
            removeItem: () => {
                throw new Error('blocked');
            },
        };

        expect(() => storePreference('light', blocked)).not.toThrow();
        expect(() => storePreference('system', blocked)).not.toThrow();
    });
});
