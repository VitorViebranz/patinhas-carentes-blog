import type { AdminSettings, SettingsInput } from '../services/api/admin-types';

export type ParsedSetting = { ok: true; payload: SettingsInput } | { ok: false; error: string };

export interface SettingField {
    id: string;
    label: string;
    hint?: string | ((data: AdminSettings) => string | undefined);
    placeholder?: string;
    inputMode?: 'decimal' | 'numeric' | 'tel' | 'text' | 'url';
    format: (data: AdminSettings) => string;
    parse: (text: string) => ParsedSetting;
}

export interface SettingGroup {
    title: string;
    description: string;
    fields: SettingField[];
}

const MAX_MONTHLY_KG = 10_000_000;
const MAX_ANIMALS = 1_000_000;
const MAX_URL_LENGTH = 500;
const PIX_LENGTH = { min: 3, max: 140 };

const fail = (error: string): ParsedSetting => ({ ok: false, error });
const accept = (payload: SettingsInput): ParsedSetting => ({ ok: true, payload });

const toNumber = (text: string): number => {
    const clean = text.trim().replace(',', '.');
    return clean === '' ? Number.NaN : Number(clean);
};

export const decimalText = (value: number): string => String(value).replace('.', ',');

function positiveNumber(build: (value: number) => SettingsInput) {
    return (text: string): ParsedSetting => {
        const value = toNumber(text);
        return Number.isFinite(value) && value > 0
            ? accept(build(value))
            : fail('Informe um valor maior que zero.');
    };
}

function parseMonthlyAverage(text: string): ParsedSetting {
    const value = toNumber(text);
    return Number.isFinite(value) && value >= 0 && value <= MAX_MONTHLY_KG
        ? accept({ monthlyAverageKg: value })
        : fail('Informe zero ou mais. Use 0 para esconder a faixa.');
}

function parseAnimalsServed(text: string): ParsedSetting {
    if (text.trim() === '') return accept({ animalsServedYear: null });
    const value = toNumber(text);
    return Number.isInteger(value) && value >= 0 && value <= MAX_ANIMALS
        ? accept({ animalsServedYear: value })
        : fail('Informe um número inteiro, ou deixe em branco para não mostrar.');
}

function parseCnpj(text: string): ParsedSetting {
    const digits = text.replace(/\D/g, '');
    if (digits === '') return accept({ cnpj: null });
    return digits.length === 14 ? accept({ cnpj: digits }) : fail('O CNPJ deve ter 14 números.');
}

function parsePixKey(text: string): ParsedSetting {
    const key = text.trim();
    if (key === '') return accept({ pixKey: null });
    return key.length >= PIX_LENGTH.min && key.length <= PIX_LENGTH.max
        ? accept({ pixKey: key })
        : fail(`A chave Pix deve ter entre ${PIX_LENGTH.min} e ${PIX_LENGTH.max} caracteres.`);
}

function parseWhatsapp(text: string): ParsedSetting {
    const digits = text.replace(/\D/g, '');
    if (digits === '') return accept({ whatsappNumber: null });
    return /^\d{10,15}$/.test(digits)
        ? accept({ whatsappNumber: digits })
        : fail('Use só números, com DDI e DDD. Exemplo: 5547991457757.');
}

function parseInstagram(text: string): ParsedSetting {
    const handle = text.trim().replace(/^@/, '');
    if (handle === '') return accept({ instagramHandle: null });
    return /^[A-Za-z0-9._]{1,30}$/.test(handle)
        ? accept({ instagramHandle: handle })
        : fail('Use só letras, números, ponto e sublinhado, sem espaços.');
}

function isWebUrl(text: string): boolean {
    try {
        const { protocol } = new URL(text);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}

function parseAdoptionUrl(text: string): ParsedSetting {
    const url = text.trim();
    if (url === '') return accept({ adoptionUrl: null });
    return isWebUrl(url) && url.length <= MAX_URL_LENGTH
        ? accept({ adoptionUrl: url })
        : fail('Informe um link completo, começando com https://.');
}

const kgPerDoseHint = (data: AdminSettings): string | undefined => {
    const kg = data.vaccineDoseCostBrl / data.kgPriceBrl;
    return Number.isFinite(kg)
        ? `Uma dose de vacina equivale a ${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg de tampinhas.`
        : undefined;
};

export const SETTING_GROUPS: SettingGroup[] = [
    {
        title: 'Cálculo do impacto',
        description: 'Esses valores alimentam a calculadora de impacto e a meta de quilos.',
        fields: [
            {
                id: 'vaccineDoseCostBrl',
                label: 'Custo médio de uma dose de vacina (R$)',
                inputMode: 'decimal',
                format: (data) => decimalText(data.vaccineDoseCostBrl),
                parse: positiveNumber((value) => ({ vaccineDoseCostBrl: value })),
            },
            {
                id: 'kgPer100LBag',
                label: 'Peso estimado de um saco de 100 litros (kg)',
                inputMode: 'decimal',
                hint: () => 'Usado quando a retirada é registrada por quantidade de sacos.',
                format: (data) => decimalText(data.kgPer100LBag),
                parse: positiveNumber((value) => ({ kgPer100LBag: value })),
            },
            {
                id: 'spayCostBrl',
                label: 'Custo médio de uma castração (R$)',
                inputMode: 'decimal',
                format: (data) => decimalText(data.spayCostBrl),
                parse: positiveNumber((value) => ({ spayCostBrl: value })),
            },
            {
                id: 'kgPriceBrl',
                label: 'Valor de um quilo de tampinha (R$)',
                inputMode: 'decimal',
                hint: kgPerDoseHint,
                format: (data) => decimalText(data.kgPriceBrl),
                parse: positiveNumber((value) => ({ kgPriceBrl: value })),
            },
            {
                id: 'gramsPerCap',
                label: 'Peso de uma tampinha (g)',
                inputMode: 'decimal',
                format: (data) => decimalText(data.gramsPerCap),
                parse: positiveNumber((value) => ({ gramsPerCap: value })),
            },
        ],
    },
    {
        title: 'Números do site',
        description: 'Aparecem na página inicial.',
        fields: [
            {
                id: 'monthlyAverageKg',
                label: 'Média mensal arrecadada (kg)',
                inputMode: 'decimal',
                hint: 'Aparece na faixa da página inicial. Use 0 para esconder.',
                format: (data) => decimalText(data.monthlyAverageKg),
                parse: parseMonthlyAverage,
            },
            {
                id: 'animalsServedYear',
                label: 'Animais atendidos no ano',
                inputMode: 'numeric',
                hint: 'Deixe em branco para não mostrar no site.',
                format: (data) =>
                    data.animalsServedYear === null ? '' : String(data.animalsServedYear),
                parse: parseAnimalsServed,
            },
        ],
    },
    {
        title: 'Contato e doações',
        description: 'Links e dados que o público usa para falar com a ONG e ajudar.',
        fields: [
            {
                id: 'whatsappNumber',
                label: 'WhatsApp (com DDI)',
                inputMode: 'tel',
                placeholder: '5547991457757',
                format: (data) => data.whatsappNumber ?? '',
                parse: parseWhatsapp,
            },
            {
                id: 'instagramHandle',
                label: 'Instagram (sem @)',
                format: (data) => data.instagramHandle ?? '',
                parse: parseInstagram,
            },
            {
                id: 'pixKey',
                label: 'Chave Pix',
                hint: 'Aparece na página Como ajudar, com botão de copiar.',
                format: (data) => data.pixKey ?? '',
                parse: parsePixKey,
            },
            {
                id: 'cnpj',
                label: 'CNPJ (só números)',
                inputMode: 'numeric',
                placeholder: '45559299000157',
                format: (data) => data.cnpj ?? '',
                parse: parseCnpj,
            },
            {
                id: 'adoptionUrl',
                label: 'Link de adoção',
                inputMode: 'url',
                placeholder: 'https://',
                format: (data) => data.adoptionUrl ?? '',
                parse: parseAdoptionUrl,
            },
        ],
    },
];
