const MONTHS = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

export function formatMonth(month: string): string {
    const [year, number] = month.split('-');
    const name = MONTHS[Number(number) - 1];
    if (!year || !name) return month;
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}`;
}

export function formatShortDate(iso: string): string {
    return new Date(iso)
        .toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'America/Sao_Paulo',
        })
        .replace(/\./g, '')
        .replace(/ de /g, ' ');
}

const BRAZIL_OFFSET_MS = -3 * 3_600_000;
const MS_PER_DAY = 86_400_000;

function dayToUtc(day: string): number {
    const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
}

export function todayInBrazil(now: Date = new Date()): string {
    return new Date(now.getTime() + BRAZIL_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatKg(kg: number): string {
    return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

export function formatDay(day: string): string {
    return new Date(dayToUtc(day))
        .toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        })
        .replace(/\./g, '')
        .replace(/ de /g, ' ');
}

export function daysSince(day: string, now: Date = new Date()): number {
    const today = new Date(now.getTime() + BRAZIL_OFFSET_MS);
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Math.max(0, Math.round((todayUtc - dayToUtc(day)) / MS_PER_DAY));
}

export function describeLastPickup(day: string | null, now: Date = new Date()): string {
    if (!day) return 'Nunca';
    const days = daysSince(day, now);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    return `Há ${days} dias`;
}

export function paragraphs(body: string): string[] {
    return body
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean);
}
