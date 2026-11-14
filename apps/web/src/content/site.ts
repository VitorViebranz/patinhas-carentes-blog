import type { FeatureKey } from '@patinhas/shared';

export const DEFAULT_WHATSAPP = '5547991457757';
export const DEFAULT_INSTAGRAM = 'patinhascarentesjoinville';

export interface NavItem {
    to: string;
    hash?: string;
    short: string;
    long: string;

    end?: boolean;
    feature?: FeatureKey;
}

export const MAIN_NAV: NavItem[] = [
    { to: '/', short: 'Início', long: 'Início', end: true },
    {
        to: '/',
        hash: '#achar',
        short: 'Doar',
        long: 'Doar tampinhas',
        feature: 'home.points',
    },
    {
        to: '/escolas-e-empresas',
        short: 'Ser ponto',
        long: 'Seja um ponto',
        feature: 'page.school',
    },
    { to: '/placar', short: 'Placar', long: 'Placar', feature: 'page.leaderboard' },
    { to: '/como-ajudar', short: 'Ajudar', long: 'Como ajudar', feature: 'page.help' },
    {
        to: '/prestacao-de-contas',
        short: 'Contas',
        long: 'Para onde vai',
        feature: 'page.report',
    },
    { to: '/historias', short: 'Histórias', long: 'Histórias', feature: 'page.stories' },
    { to: '/denuncia', short: 'Denunciar', long: 'Denunciar', feature: 'page.denounce' },
];

export interface FooterLink {
    to: string;
    label: string;
    feature?: FeatureKey;
}

export const FOOTER_LINKS: FooterLink[] = [
    { to: '/escolas-e-empresas', label: 'Seja um ponto de coleta', feature: 'page.school' },
    { to: '/placar', label: 'Placar dos pontos de coleta', feature: 'page.leaderboard' },
    { to: '/como-ajudar', label: 'Como ajudar', feature: 'page.help' },
    {
        to: '/prestacao-de-contas',
        label: 'Para onde vai a tampinha',
        feature: 'page.report',
    },
    { to: '/historias', label: 'Histórias de resgate', feature: 'page.stories' },
    { to: '/denuncia', label: 'Denunciar maus-tratos', feature: 'page.denounce' },
    { to: '/privacidade', label: 'Privacidade' },
];
