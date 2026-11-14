import type { PointCategory } from '../services/api/types';
import type { AdminHelpRequest } from '../services/api/admin-types';

export const CATEGORY_LABEL: Record<PointCategory, string> = {
    PET_VET: 'Pet e veterinária',
    EDUCATION: 'Escola e educação',
    HEALTH: 'Saúde',
    GROCERY_FOOD: 'Mercado e alimentação',
    COMMERCE_SERVICES: 'Comércio e serviços',
};

export const REQUEST_TYPE_LABEL: Record<AdminHelpRequest['type'], string> = {
    COLLECTION_POINT: 'Ponto de coleta',
    FOSTER: 'Lar temporário',
    TALK: 'Palestra',
};

export const INSTITUTION_LABEL = {
    SCHOOL: 'Escola',
    COMPANY: 'Empresa',
    STORE: 'Comércio',
    CONDO: 'Condomínio',
} as const;

export const PRECISION_LABEL = {
    HOUSE_NUMBER: 'Exata',
    STREET: 'Na rua',
    PLACE_NAME: 'Pelo nome',
    NEIGHBORHOOD: 'Aproximada',
} as const;

export function requestTitle(request: AdminHelpRequest): string {
    return request.institutionName ? `${request.institutionName}` : request.requesterName;
}

export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    });
}
