import { formatMonth } from '../lib/format';

const BRAZIL_OFFSET_MS = -3 * 3_600_000;
const RECENT_COUNT = 6;

export type MonthState = 'published' | 'draft' | 'missing';

interface ReportLike {
    month: string;
    status: 'DRAFT' | 'PUBLISHED';
    totalKg: number;
}

function format(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function previousMonth(now: Date = new Date()): string {
    return recentMonths(now, 1)[0] ?? '';
}

export function recentMonths(now: Date = new Date(), count: number = RECENT_COUNT): string[] {
    const local = new Date(now.getTime() + BRAZIL_OFFSET_MS);
    const months: string[] = [];
    for (let back = 1; back <= count; back += 1) {
        const shifted = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - back, 1));
        months.push(format(shifted.getUTCFullYear(), shifted.getUTCMonth()));
    }
    return months;
}

export function monthState(month: string, reports: readonly ReportLike[]): MonthState {
    const found = reports.find((report) => report.month === month);
    if (!found) return 'missing';
    return found.status === 'PUBLISHED' ? 'published' : 'draft';
}

export function shortMonthLabel(month: string): string {
    const name = formatMonth(month).split(' ')[0] ?? month;
    return `${name.slice(0, 3)}/${month.slice(2, 4)}`;
}

export function yearSummary(reports: readonly ReportLike[], year: string, goalKg: number, doseKg = 30) {
    const published = reports.filter(
        (report) => report.status === 'PUBLISHED' && report.month.startsWith(`${year}-`),
    );
    const kg = published.reduce((sum, report) => sum + report.totalKg, 0);
    return { months: published.length, kg, castrations: Math.floor(kg / goalKg), doses: Math.floor(kg / doseKg) };
}
