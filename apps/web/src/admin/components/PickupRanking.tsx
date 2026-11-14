import { StateMessage } from '../../components/state-message/StateMessage';
import { describeLastPickup, formatKg } from '../../lib/format';
import { useAllActivePoints, usePickupSummary } from '../../services/api/admin';
import styles from '../admin.module.css';
import { buildRanking } from '../pickup-ranking';
import { EmptyState } from './EmptyState';

export function PickupRanking() {
    const points = useAllActivePoints();
    const summary = usePickupSummary();

    const ranking = points.data && summary.data ? buildRanking(points.data, summary.data) : null;

    return (
        <div className={styles['card']}>
            <div className={styles['cardHead']}>
                <h2>Placar e certificados</h2>
                <a
                    className={styles['link']}
                    href="/placar"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Ver o placar no site
                </a>
            </div>
            <p className={styles['muted']}>
                Todos os pontos que já tiveram retirada, do que mais entregou para o que menos
                entregou. O certificado fica pronto para imprimir.
            </p>
            {points.isError || summary.isError ? (
                <StateMessage
                    kind="error"
                    onRetry={() => {
                        void points.refetch();
                        void summary.refetch();
                    }}
                >
                    Não foi possível carregar o placar.
                </StateMessage>
            ) : null}
            {!ranking && !points.isError && !summary.isError ? (
                <StateMessage kind="loading">Carregando...</StateMessage>
            ) : null}
            {ranking && ranking.length === 0 ? (
                <EmptyState
                    icon="chart"
                    title="O placar ainda está vazio"
                    hint="Assim que você registrar a primeira retirada, o ponto aparece aqui."
                />
            ) : null}
            {ranking && ranking.length > 0 ? (
                <div className={styles['tableWrap']}>
                    <table className={styles['table']}>
                        <thead>
                            <tr>
                                <th>Posição</th>
                                <th>Ponto</th>
                                <th>Total</th>
                                <th>Retiradas</th>
                                <th>Última</th>
                                <th>Certificado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((row) => (
                                <tr key={row.pointId}>
                                    <td data-label="Posição">{row.rank}º</td>
                                    <td data-label="Ponto">
                                        <b>{row.name}</b>
                                        <br />
                                        <span className={styles['muted']}>{row.neighborhood}</span>
                                    </td>
                                    <td data-label="Total">{formatKg(row.totalKg)}</td>
                                    <td data-label="Retiradas">{row.pickups}</td>
                                    <td data-label="Última">
                                        {describeLastPickup(row.lastPickupOn)}
                                    </td>
                                    <td data-label="Certificado">
                                        <a
                                            className={`${styles['btn']} ${styles['ghost']} ${styles['sm']}`}
                                            href={`/certificado/${row.pointId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Abrir certificado
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}
