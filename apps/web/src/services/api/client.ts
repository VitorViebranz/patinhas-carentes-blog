const API_BASE = '/api/v1';

export interface ApiErrorDetail {
    path?: string;
    message: string;
}

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly details: ApiErrorDetail[] = [],
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;

    formData?: FormData;
    signal?: AbortSignal;
}

function toApiError(status: number, data: unknown): ApiError {
    const error = (
        data as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } } | null
    )?.error;
    return new ApiError(
        status,
        error?.code ?? 'UNKNOWN_ERROR',
        error?.message ?? 'Algo deu errado. Tente de novo.',
        error?.details ?? [],
    );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const init: RequestInit = {
        method: options.method ?? 'GET',
        credentials: 'same-origin',
        ...(options.signal ? { signal: options.signal } : {}),
        ...(options.formData
            ? { body: options.formData }
            : options.body === undefined
              ? {}
              : {
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(options.body),
                }),
    };

    const send = async (requestInit: RequestInit): Promise<Response> => {
        try {
            return await fetch(`${API_BASE}${path}`, requestInit);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') throw error;
            throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Tente de novo.');
        }
    };

    let response = await send(init);
    if (response.status === 304) response = await send({ ...init, cache: 'reload' });

    if (response.status === 204) return undefined as T;
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw toApiError(response.status, data);
    return data as T;
}
