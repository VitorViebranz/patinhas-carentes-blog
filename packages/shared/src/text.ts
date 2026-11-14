export function normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function slugify(value: string): string {
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

export function formatBrazilianPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const national = digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
    const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(national);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

export function whatsappUrl(number: string, message?: string): string {
    const base = `https://wa.me/${number.replace(/\D/g, '')}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function instagramUrl(handle: string): string {
    return `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
}

export function formatCnpj(value: string): string {
    const match = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/.exec(value.replace(/\D/g, ''));
    return match ? `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}` : value;
}
