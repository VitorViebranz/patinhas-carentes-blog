export type FeatureKind = 'page' | 'section' | 'global';

export interface FeatureDefinition {
    key: string;
    kind: FeatureKind;
    label: string;
    description: string;
    path?: string;
}

export const FEATURES = [
    {
        key: 'page.school',
        kind: 'page',
        label: 'Seja um ponto de coleta',
        description:
            'Página para escolas, empresas e lojas pedirem para virar ponto, com o cartaz para imprimir.',
        path: '/escolas-e-empresas',
    },
    {
        key: 'page.leaderboard',
        kind: 'page',
        label: 'Placar',
        description: 'Ranking dos pontos que mais entregaram tampinhas e o certificado de cada um.',
        path: '/placar',
    },
    {
        key: 'page.help',
        kind: 'page',
        label: 'Como ajudar',
        description: 'Lar temporário, adoção, loja, feirinhas e doação em dinheiro.',
        path: '/como-ajudar',
    },
    {
        key: 'page.report',
        kind: 'page',
        label: 'Para onde vai a tampinha',
        description: 'Prestação de contas mês a mês.',
        path: '/prestacao-de-contas',
    },
    {
        key: 'page.stories',
        kind: 'page',
        label: 'Histórias de resgate',
        description: 'Textos e fotos dos resgates.',
        path: '/historias',
    },
    {
        key: 'page.denounce',
        kind: 'page',
        label: 'Denunciar maus-tratos',
        description: 'Telefones e portal para denunciar.',
        path: '/denuncia',
    },
    {
        key: 'home.stats',
        kind: 'section',
        label: 'Números da campanha',
        description: 'Faixa com pontos de coleta, média mensal e animais atendidos.',
    },
    {
        key: 'home.paths',
        kind: 'section',
        label: 'O que você quer fazer hoje?',
        description: 'Três cartões com os caminhos principais.',
    },
    {
        key: 'home.impact',
        kind: 'section',
        label: 'Calculadora de impacto',
        description: 'Mostra quanto as tampinhas rendem.',
    },
    {
        key: 'home.how',
        kind: 'section',
        label: 'Como funciona',
        description: 'Os 3 passos da tampinha ao cuidado.',
    },
    {
        key: 'home.points',
        kind: 'section',
        label: 'Pontos de coleta',
        description:
            'Mapa e lista para achar o ponto mais perto. Desligar também tira os botões Doar tampinhas e Achar o ponto de coleta.',
    },
    {
        key: 'home.checker',
        kind: 'section',
        label: 'O que pode doar',
        description: 'Ajuda a conferir se a tampa serve.',
    },
    {
        key: 'home.callout',
        kind: 'section',
        label: 'Falta ponto perto de você?',
        description: 'Faixa que convida a abrir um novo ponto.',
    },
    {
        key: 'home.about',
        kind: 'section',
        label: 'Quem somos',
        description: 'Texto sobre a ONG.',
    },
    {
        key: 'home.foster',
        kind: 'section',
        label: 'Lares temporários',
        description: 'Convite para acolher um bichinho.',
    },
    {
        key: 'home.instagram',
        kind: 'section',
        label: 'Instagram',
        description: 'Fotos e botão para seguir.',
    },
    {
        key: 'global.whatsapp',
        kind: 'global',
        label: 'Botão do WhatsApp',
        description: 'Botão verde fixo no canto de todas as páginas.',
    },
] as const satisfies readonly FeatureDefinition[];

export type FeatureKey = (typeof FEATURES)[number]['key'];

export const FEATURE_KEYS: readonly FeatureKey[] = FEATURES.map((feature) => feature.key);

export function isFeatureKey(value: string): value is FeatureKey {
    return (FEATURE_KEYS as readonly string[]).includes(value);
}

export function isHidden(hidden: readonly string[], key: FeatureKey): boolean {
    return hidden.includes(key);
}
