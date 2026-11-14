import { GROUP_EFFECT_PEOPLE, METER_MAX_CAPS } from './constants';

export interface ImpactSettings {
    gramsPerCap: number;
    kgPriceBrl: number;
    spayCostBrl: number;
    vaccineDoseCostBrl: number;
}

export interface Impact {
    caps: number;
    kg: number;
    reais: number;
    spayFraction: number;
    doseFraction: number;
}

const ptBR = (value: number, maximumFractionDigits = 0, minimumFractionDigits = 0): string =>
    value.toLocaleString('pt-BR', { maximumFractionDigits, minimumFractionDigits });

export function goalKg(settings: ImpactSettings): number {
    return settings.spayCostBrl / settings.kgPriceBrl;
}

export function doseKg(settings: ImpactSettings): number {
    return settings.vaccineDoseCostBrl / settings.kgPriceBrl;
}

export function goalCaps(settings: ImpactSettings): number {
    return Math.round((goalKg(settings) * 1000) / settings.gramsPerCap);
}

export function capsForKg(kg: number, settings: ImpactSettings): number {
    return Math.round((kg * 1000) / settings.gramsPerCap);
}

export function calculateImpact(
    rawCaps: number,
    settings: ImpactSettings,
    maxCaps: number = METER_MAX_CAPS,
): Impact {
    const caps = Math.max(0, Math.min(maxCaps, Number.isFinite(rawCaps) ? rawCaps : 0));
    const kg = (caps * settings.gramsPerCap) / 1000;
    const reais = kg * settings.kgPriceBrl;
    return {
        caps,
        kg,
        reais,
        spayFraction: reais / settings.spayCostBrl,
        doseFraction: reais / settings.vaccineDoseCostBrl,
    };
}

export function groupImpact(
    caps: number,
    settings: ImpactSettings,
    people: number = GROUP_EFFECT_PEOPLE,
): Impact {
    return calculateImpact(caps * people, settings, Number.POSITIVE_INFINITY);
}

export function formatCaps(caps: number): string {
    return ptBR(Math.round(caps));
}

export function describeWeight(kg: number): string {
    if (kg <= 0) return 'nenhuma ainda';
    return kg < 1 ? `cerca de ${ptBR(Math.round(kg * 1000))} g` : `cerca de ${ptBR(kg, 1)} kg`;
}

export function describeReais(value: number): string {
    return value
        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        .replace(/\u00a0/g, ' ');
}

export function describeSpayShare(fraction: number): string {
    if (fraction >= 1) return `${ptBR(fraction, 1, 1)} castrações`;
    const percent = fraction * 100;
    const digits = percent < 1 ? 2 : percent < 10 ? 1 : 0;
    return `${ptBR(percent, digits, digits)}% de uma castração`;
}

export function describeDoseShare(fraction: number): string {
    if (fraction >= 1) {
        const doses = Math.floor(fraction);
        return `${ptBR(fraction, 1, 1)} ${doses === 1 && fraction < 2 ? 'dose' : 'doses'} de vacina`;
    }
    const percent = fraction * 100;
    const digits = percent < 1 ? 2 : percent < 10 ? 1 : 0;
    return `${ptBR(percent, digits, digits)}% de uma dose de vacina`;
}

export function describeGroupEffect(impact: Impact, people: number = GROUP_EFFECT_PEOPLE): string {
    return `Se ${ptBR(people)} pessoas doarem a mesma quantidade, são ${formatCaps(impact.caps)} tampinhas: ${describeReais(impact.reais)}, ou ${describeDoseShare(impact.doseFraction)}.`;
}
