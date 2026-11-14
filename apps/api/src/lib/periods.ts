import { BRAZIL_OFFSET_MS } from './months';

export const PERIODS = ['month', 'year', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export function dateOnly(text: string): Date {
    return new Date(`${text}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function brazilToday(now: Date): string {
    return formatDateOnly(new Date(now.getTime() + BRAZIL_OFFSET_MS));
}

export function periodStart(period: Period, now: Date): Date | null {
    if (period === 'all') return null;
    const today = brazilToday(now);
    return dateOnly(period === 'month' ? `${today.slice(0, 7)}-01` : `${today.slice(0, 4)}-01-01`);
}
