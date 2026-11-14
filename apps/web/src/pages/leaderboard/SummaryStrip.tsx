import { formatCaps } from '@patinhas/shared';
import { formatKg } from '../../lib/format';
import type { Leaderboard } from '../../services/api/types';
import { describePeriod } from './period';
import styles from './leaderboard.module.css';

interface SummaryStripProps {
    data: Leaderboard;
}

export function SummaryStrip({ data }: SummaryStripProps) {
    const stats: [string, string][] = [
        [formatKg(data.totalKg), 'de tampinhas recolhidas'],
        [formatCaps(data.capCount), 'tampinhas no total'],
        [String(data.doses), data.doses === 1 ? 'dose de vacina paga' : 'doses de vacina pagas'],
        [String(data.pointCount), data.pointCount === 1 ? 'ponto ajudou' : 'pontos ajudaram'],
    ];
    return (
        <section className={styles['summary']} aria-label="Resumo do período">
            <p className={styles['summaryTitle']}>
                Juntos, os pontos de coleta entregaram {describePeriod(data.period, data.since)}:
            </p>
            <dl className={styles['stats']}>
                {stats.map(([value, label]) => (
                    <div key={label} className={styles['stat']}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
