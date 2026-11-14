import type { FeatureKey } from '@patinhas/shared';
import type { IconName } from '../components/icon/icon-data';

export interface HelpCard {
    icon: IconName;
    title: string;
    text: string;
    cta: string;
    to: string;
    hash?: string;
    feature: FeatureKey;
}

export const HELP_CARDS: HelpCard[] = [
    {
        icon: 'cap',
        title: 'Doar tampinhas',
        text: 'Encontre o ponto de coleta mais perto da sua casa e deixe suas tampinhas plásticas.',
        cta: 'Achar meu ponto',
        to: '/',
        hash: '#achar',
        feature: 'home.points',
    },
    {
        icon: 'school',
        title: 'Escolas, empresas e lojas',
        text: 'Torne seu espaço um ponto de coleta e receba um cartaz pronto para imprimir.',
        cta: 'Quero participar',
        to: '/escolas-e-empresas',
        feature: 'page.school',
    },
    {
        icon: 'heart',
        title: 'Lar temporário e adoção',
        text: 'Receba um animal em casa até ele encontrar uma família, ou adote.',
        cta: 'Ver como ajudar',
        to: '/como-ajudar',
        feature: 'page.help',
    },
];

export interface HowStep {
    icon: IconName;
    title: string;
    text: string;
}

export const HOW_STEPS: HowStep[] = [
    {
        icon: 'cap',
        title: 'Junte e leve',
        text: 'Guarde tampinhas plásticas limpas e deixe no ponto de coleta mais perto de você.',
    },
    {
        icon: 'truck',
        title: 'A equipe busca',
        text: 'Voluntários recolhem as tampinhas em cada ponto e enviam para a reciclagem.',
    },
    {
        icon: 'heart',
        title: 'Vira cuidado',
        text: 'O dinheiro da reciclagem paga ração, vacina e medicação dos animais resgatados.',
    },
];

export interface CollectItem {
    label: string;
    title: string;
    accepted: boolean;
}

export const COLLECT_ITEMS: CollectItem[] = [
    { label: 'Chocolatado', title: 'Tampinha de chocolatado', accepted: true },
    { label: 'Lacre de latinha', title: 'Lacre de latinha', accepted: false },
    { label: 'Requeijão', title: 'Tampinha de requeijão', accepted: true },
    { label: 'Rolha', title: 'Rolha', accepted: false },
    { label: 'Shampoo', title: 'Tampinha de shampoo', accepted: true },
    { label: 'Tampa de metal', title: 'Tampa de metal', accepted: false },
    { label: 'Sorvete', title: 'Tampinha de sorvete', accepted: true },
    { label: 'Seringa', title: 'Seringa', accepted: false },
    { label: 'Margarina', title: 'Tampinha de margarina', accepted: true },
    { label: 'Talheres', title: 'Talheres e utensílios', accepted: false },
    { label: 'Detergente', title: 'Tampinha de detergente', accepted: true },
    { label: 'Refrigerante', title: 'Tampinha de refrigerante', accepted: true },
    { label: 'Caneta', title: 'Tampinha de caneta', accepted: true },
];

export const CAN_COLLECT =
    'Tampinhas de chocolatado, requeijão, shampoo, sorvete, margarina, detergente, refrigerante, caneta e outras.';
export const CANNOT_COLLECT =
    'Tampas de metal, lacres de latinha, rolhas, seringas, talheres e qualquer utensílio.';
