import { describe, expect, it } from 'vitest';
import { FEATURES, FEATURE_KEYS, isFeatureKey, isHidden } from './features';

describe('FEATURES', () => {
    it('has a unique key for every item', () => {
        expect(new Set(FEATURE_KEYS).size).toBe(FEATURES.length);
    });

    it('names every key after its kind', () => {
        for (const feature of FEATURES) {
            const prefix = { page: 'page.', section: 'home.', global: 'global.' }[feature.kind];
            expect(feature.key.startsWith(prefix)).toBe(true);
        }
    });

    it('gives each page a path and no other item one', () => {
        for (const feature of FEATURES) {
            if (feature.kind === 'page') {
                expect('path' in feature && feature.path.startsWith('/')).toBe(true);
            } else {
                expect('path' in feature).toBe(false);
            }
        }
    });

    it('never lets the home or the privacy page be turned off', () => {
        const paths: string[] = FEATURES.flatMap((feature) =>
            'path' in feature ? [feature.path] : [],
        );

        expect(paths).not.toContain('/');
        expect(paths).not.toContain('/privacidade');
    });
});

describe('isFeatureKey', () => {
    it('accepts a known key and rejects anything else', () => {
        expect(isFeatureKey('page.leaderboard')).toBe(true);
        expect(isFeatureKey('page.nope')).toBe(false);
        expect(isFeatureKey('')).toBe(false);
    });
});

describe('isHidden', () => {
    it('tells whether the key is in the hidden list', () => {
        expect(isHidden(['home.points'], 'home.points')).toBe(true);
        expect(isHidden(['home.points'], 'home.about')).toBe(false);
        expect(isHidden([], 'home.points')).toBe(false);
    });
});
