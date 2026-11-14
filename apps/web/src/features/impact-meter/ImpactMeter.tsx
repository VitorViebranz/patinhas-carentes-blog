import {
    METER_MAX_CAPS,
    calculateImpact,
    capsForKg,
    describeGroupEffect,
    describeReais,
    describeDoseShare,
    describeWeight,
    doseKg,
    formatCaps,
    groupImpact,
    type ImpactSettings,
} from '@patinhas/shared';
import { useId, useState, type CSSProperties } from 'react';
import styles from './impact-meter.module.css';

const RANGE_STEP = 10;
const BUTTON_STEP = 100;
const INITIAL_CAPS = 100;
const MIDDLE_TICKS_KG = [1, 2.5];

interface ImpactMeterProps {
    settings: ImpactSettings;
}

interface Tick {
    key: string;
    caps: number;
    weight: string;
    value: string | null;
    placement: 'first' | 'middle' | 'last';
}

const kgText = (kg: number): string => `${kg.toLocaleString('pt-BR')} kg`;

function buildTicks(settings: ImpactSettings): Tick[] {
    const withValue = (kg: number, placement: Tick['placement']): Tick => ({
        key: `${kg}`,
        caps: capsForKg(kg, settings),
        weight: kgText(kg),
        value: describeReais(kg * settings.kgPriceBrl),
        placement,
    });
    const maxKg = calculateImpact(METER_MAX_CAPS, settings).kg;
    const middle = MIDDLE_TICKS_KG.filter((kg) => kg < maxKg).map((kg) => withValue(kg, 'middle'));
    return [
        { key: 'zero', caps: 0, weight: '0', value: null, placement: 'first' },
        ...middle,
        withValue(maxKg, 'last'),
    ];
}

function tickStyle(tick: Tick): CSSProperties {
    if (tick.placement === 'first') return { left: 0 };
    if (tick.placement === 'last') return { right: 0 };
    return { left: `${(tick.caps / METER_MAX_CAPS) * 100}%` };
}

export function ImpactMeter({ settings }: ImpactMeterProps) {
    const headingId = useId();
    const [caps, setCaps] = useState(INITIAL_CAPS);
    const impact = calculateImpact(caps, settings);
    const group = groupImpact(impact.caps, settings);
    const ticks = buildTicks(settings);
    const progress = (impact.caps / METER_MAX_CAPS) * 100;

    const change = (value: number) => {
        setCaps(calculateImpact(value, settings).caps);
    };

    return (
        <section className={styles['impact']} aria-labelledby={headingId}>
            <h2 id={headingId}>Quanto vale a tampinha que você tem em casa?</h2>

            <div className={styles['meter']}>
                <p className={styles['hint']}>
                    Arraste a barra para a quantidade de tampinhas que você tem
                </p>

                <div className={styles['row']}>
                    <button
                        type="button"
                        className={styles['step']}
                        aria-label="Menos cem tampinhas"
                        onClick={() => {
                            change(impact.caps - BUTTON_STEP);
                        }}
                    >
                        −
                    </button>
                    <div className={styles['value']}>
                        <b>{formatCaps(impact.caps)}</b> <span>tampinhas</span>
                        <small>{describeWeight(impact.kg)}</small>
                    </div>
                    <button
                        type="button"
                        className={styles['step']}
                        aria-label="Mais cem tampinhas"
                        onClick={() => {
                            change(impact.caps + BUTTON_STEP);
                        }}
                    >
                        +
                    </button>
                </div>

                <div className={styles['rangeWrap']}>
                    <input
                        className={styles['range']}
                        type="range"
                        min={0}
                        max={METER_MAX_CAPS}
                        step={RANGE_STEP}
                        value={impact.caps}
                        aria-label="Quantidade de tampinhas"
                        aria-valuetext={`${formatCaps(impact.caps)} tampinhas`}
                        style={{ '--progress': `${progress}%` } as CSSProperties}
                        onChange={(event) => {
                            change(Number(event.target.value));
                        }}
                    />
                    <div className={styles['ticks']} aria-hidden="true">
                        {ticks.map((tick) => (
                            <span
                                key={tick.key}
                                className={[
                                    styles['tick'],
                                    tick.placement === 'last' ? styles['tickLast'] : '',
                                    impact.caps >= tick.caps && tick.caps > 0
                                        ? styles['tickOn']
                                        : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                style={tickStyle(tick)}
                            >
                                {tick.weight}
                                {tick.value ? (
                                    <>
                                        <br />
                                        {tick.value}
                                    </>
                                ) : null}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={styles['out']} aria-live="polite" aria-atomic="true">
                    <div className={styles['big']}>{describeReais(impact.reais)}</div>
                    <p>ou {describeDoseShare(impact.doseFraction)}</p>
                    {impact.caps > 0 ? (
                        <p className={styles['group']}>{describeGroupEffect(group)}</p>
                    ) : null}
                </div>
            </div>

            <p className={styles['fine']}>
                Conta da equipe: o quilo de tampinha rende {describeReais(settings.kgPriceBrl)} e
                uma dose de vacina custa em média {describeReais(settings.vaccineDoseCostBrl)}, o que
                equivale a cerca de {kgText(doseKg(settings))} ou{' '}
                {formatCaps((doseKg(settings) * 1000) / settings.gramsPerCap)} tampinhas.
                Por isso cada tampinha conta e a campanha depende de muita gente. Estimativa de
                peso: {settings.gramsPerCap.toLocaleString('pt-BR')} g por tampinha,{' '}
                {formatCaps(1000 / settings.gramsPerCap)} por quilo.
            </p>
        </section>
    );
}
