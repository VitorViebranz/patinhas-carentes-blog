export function isValidContact(value: string): boolean {
    const text = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true;
    return /^\+?[\d\s().-]{10,20}$/.test(text);
}
