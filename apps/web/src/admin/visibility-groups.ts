import type { FeatureKind } from '@patinhas/shared';

export interface VisibilityGroup {
    kind: FeatureKind;
    title: string;
    hint: string;
}

export const VISIBILITY_GROUPS: VisibilityGroup[] = [
    {
        kind: 'page',
        title: 'Páginas do site',
        hint: 'Desligada, a página some do menu e do rodapé e o endereço deixa de abrir.',
    },
    {
        kind: 'section',
        title: 'Página inicial',
        hint: 'Esconda uma parte da página inicial sem tirar a página do ar.',
    },
    {
        kind: 'global',
        title: 'Em todas as páginas',
        hint: 'Itens que aparecem em qualquer tela do site.',
    },
];

export function describeOffCount(count: number): string {
    if (count === 0) return 'Tudo está ligado.';
    return count === 1 ? '1 item desligado.' : `${count} itens desligados.`;
}
