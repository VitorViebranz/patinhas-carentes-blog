export const DEFAULT_SPACE_NAME = 'Escola Exemplo';
export const MAX_SPACE_NAME_LENGTH = 80;

export const POSTER_ACCEPTED = [
    'Tampinhas de garrafa',
    'Tampas de pote',
    'Tampas de produto de limpeza',
] as const;

export const POSTER_REFUSED = ['Lacre de latinha', 'Rolha', 'Tampa de metal'] as const;

const MEDIUM_NAME_LENGTH = 24;
const LONG_NAME_LENGTH = 40;

export function posterName(raw: string): string {
    return raw.trim() || 'Nome do seu espaço';
}

export function posterNameSize(name: string): 'large' | 'medium' | 'small' {
    if (name.length > LONG_NAME_LENGTH) return 'small';
    return name.length > MEDIUM_NAME_LENGTH ? 'medium' : 'large';
}

export function posterMessage(raw: string): string {
    const name = posterName(raw);
    return `Oi! O(a) ${name} agora é ponto de coleta de tampinhas plásticas do Patinhas Carentes Joinville. Junte tampinhas em casa e traga para cá. Cada saco ajuda a pagar ração, vacina e medicação de animais resgatados.`;
}
