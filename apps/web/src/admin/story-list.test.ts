import { describe, expect, it } from 'vitest';
import { countStories, countWords, describeReading, filterStories } from './story-list';

const stories = [
    { id: 1, status: 'PUBLISHED' as const },
    { id: 2, status: 'DRAFT' as const },
    { id: 3, status: 'PUBLISHED' as const },
];

describe('filterStories', () => {
    it('keeps everything for all', () => {
        expect(filterStories(stories, 'all')).toHaveLength(3);
    });

    it('separates published from drafts', () => {
        expect(filterStories(stories, 'published').map((story) => story.id)).toEqual([1, 3]);
        expect(filterStories(stories, 'draft').map((story) => story.id)).toEqual([2]);
    });

    it('does not change the list it receives', () => {
        const copy = [...stories];

        filterStories(copy, 'draft');

        expect(copy).toEqual(stories);
    });
});

describe('countStories', () => {
    it('counts by filter', () => {
        expect(countStories(stories, 'all')).toBe(3);
        expect(countStories(stories, 'published')).toBe(2);
        expect(countStories(stories, 'draft')).toBe(1);
    });
});

describe('countWords', () => {
    it('ignores extra spaces and line breaks', () => {
        expect(countWords('  um dois\n\n três  ')).toBe(3);
        expect(countWords('')).toBe(0);
        expect(countWords('   ')).toBe(0);
    });
});

describe('describeReading', () => {
    it('says nothing for an empty text', () => {
        expect(describeReading('')).toBe('');
    });

    it('rounds the reading time up to at least one minute', () => {
        expect(describeReading('um')).toBe('1 palavra, leitura de cerca de 1 min');
        expect(describeReading('palavra '.repeat(400))).toBe(
            '400 palavras, leitura de cerca de 2 min',
        );
    });
});
