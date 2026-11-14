export function iso(date: Date): string {
    return date.toISOString();
}

export function isoOrNull(date: Date | null): string | null {
    return date ? date.toISOString() : null;
}
