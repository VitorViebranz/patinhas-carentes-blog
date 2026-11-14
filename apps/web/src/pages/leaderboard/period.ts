import { formatMonth } from '../../lib/format';
import type { LeaderboardPeriod } from '../../services/api/types';

export const PERIOD_TABS: [LeaderboardPeriod, string][] = [
    ['month', 'Este mês'],
    ['year', 'Este ano'],
    ['all', 'Desde o início'],
];

export function describePeriod(period: LeaderboardPeriod, since: string | null): string {
    if (period === 'all' || !since) return 'desde o início';
    if (period === 'year') return `em ${since.slice(0, 4)}`;
    const month = formatMonth(since.slice(0, 7));
    return `em ${month.charAt(0).toLowerCase()}${month.slice(1)}`;
}
