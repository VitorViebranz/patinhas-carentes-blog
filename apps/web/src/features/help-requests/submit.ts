import { ApiError } from '../../services/api/client';

export function requestErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 429)
            return 'Muitos pedidos em pouco tempo. Tente de novo mais tarde ou chame no WhatsApp.';
        if (error.status === 0) return error.message;
        if (error.status === 400) return 'Confira os dados e tente de novo.';
    }
    return 'Não conseguimos enviar agora. Tente de novo ou chame no WhatsApp.';
}
