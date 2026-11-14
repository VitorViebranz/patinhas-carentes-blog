export type StoryFilter = 'all' | 'published' | 'draft';

interface StoryLike {
    status: 'DRAFT' | 'PUBLISHED';
}

const WORDS_PER_MINUTE = 200;

export const STORY_FILTERS: [StoryFilter, string][] = [
    ['all', 'Todas'],
    ['published', 'Publicadas'],
    ['draft', 'Rascunhos'],
];

export function filterStories<T extends StoryLike>(
    stories: readonly T[],
    filter: StoryFilter,
): T[] {
    if (filter === 'all') return [...stories];
    const wanted = filter === 'published' ? 'PUBLISHED' : 'DRAFT';
    return stories.filter((story) => story.status === wanted);
}

export function countStories(stories: readonly StoryLike[], filter: StoryFilter): number {
    return filterStories(stories, filter).length;
}

export function countWords(text: string): number {
    const trimmed = text.trim();
    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function describeReading(text: string): string {
    const words = countWords(text);
    if (words === 0) return '';
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
    const wordText = words === 1 ? '1 palavra' : `${words.toLocaleString('pt-BR')} palavras`;
    return `${wordText}, leitura de cerca de ${minutes} min`;
}
