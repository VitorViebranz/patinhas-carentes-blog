import { formatCaps } from '@patinhas/shared';
import { SiteImage } from '../../components/site-image/SiteImage';
import { formatDay, formatKg } from '../../lib/format';
import { posterNameSize } from '../../features/poster/poster-text';
import type { PointImpact } from '../../services/api/types';
import styles from './certificate.module.css';

interface CertificateProps {
    impact: PointImpact;
    instagram: string;
    issuedOn: string;
}

export function Certificate({ impact, instagram, issuedOn }: CertificateProps) {
    const { point } = impact;
    const stats: [string, string][] = [
        [formatCaps(impact.capCount), 'tampinhas'],
        [
            String(impact.doses),
            impact.doses === 1 ? 'dose de vacina paga' : 'doses de vacina pagas',
        ],
        [String(impact.pickups), impact.pickups === 1 ? 'retirada' : 'retiradas'],
    ];

    return (
        <div className={`${styles['certificate']} theme-light`} id="certificate">
            <div className={styles['frame']}>
                <div className={styles['top']}>
                    <SiteImage file="logo-real.jpg" alt="" width={40} height={40} />
                    <span className={styles['brand']}>Patinhas Carentes Joinville</span>
                </div>

                <p className={styles['kicker']}>Certificado de ponto de coleta</p>
                <p className={styles['lead']}>Certificamos que</p>

                <div className={styles['place']} data-size={posterNameSize(point.name)}>
                    <span className={styles['name']}>{point.name}</span>
                </div>
                <p className={styles['where']}>{point.neighborhood}, Joinville</p>

                <p className={styles['lead']}>é ponto de coleta e já entregou</p>
                <p className={styles['kg']}>{formatKg(impact.totalKg)}</p>
                <p className={styles['since']}>
                    {impact.firstPickupOn
                        ? `de tampinhas, desde ${formatDay(impact.firstPickupOn)}`
                        : 'de tampinhas'}
                </p>

                <ul className={styles['stats']}>
                    {stats.map(([value, label]) => (
                        <li key={label} className={styles['stat']}>
                            <b>{value}</b>
                            <span>{label}</span>
                        </li>
                    ))}
                </ul>

                <p className={styles['thanks']}>
                    Obrigado por transformar tampinhas em cuidado para os animais de Joinville.
                </p>
            </div>
            <div className={styles['foot']}>
                <span>Emitido em {formatDay(issuedOn)}</span>
                <b>@{instagram}</b>
            </div>
        </div>
    );
}
