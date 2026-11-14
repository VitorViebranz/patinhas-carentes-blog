export interface PostalAddress {
    postalCode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}

export interface PostalLookup {
    lookup(postalCode: string): Promise<PostalAddress | null>;
}

type FetchLike = (
    url: string,
    init: { signal: AbortSignal },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface ViaCepOptions {
    baseUrl: string;
    timeoutMs?: number;
    fetchImpl?: FetchLike;
}

export function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

export function formatPostalCode(digits: string): string {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export class ViaCepLookup implements PostalLookup {
    constructor(private readonly options: ViaCepOptions) {}

    async lookup(postalCode: string): Promise<PostalAddress | null> {
        const digits = digitsOnly(postalCode);
        if (digits.length !== 8) return null;

        const fetchImpl = this.options.fetchImpl ?? (fetch as unknown as FetchLike);
        try {
            const response = await fetchImpl(`${this.options.baseUrl}/ws/${digits}/json/`, {
                signal: AbortSignal.timeout(this.options.timeoutMs ?? 6000),
            });
            if (!response.ok) return null;
            const data = (await response.json()) as Record<string, unknown>;
            if (data['erro']) return null;
            const text = (key: string) => (typeof data[key] === 'string' ? data[key].trim() : '');
            return {
                postalCode: formatPostalCode(digits),
                street: text('logradouro'),
                neighborhood: text('bairro'),
                city: text('localidade'),
                state: text('uf'),
            };
        } catch {
            return null;
        }
    }
}
