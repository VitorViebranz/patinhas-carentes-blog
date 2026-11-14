import { StateMessage } from '../../components/state-message/StateMessage';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useAllActivePoints } from '../../services/api/admin';
import styles from '../admin.module.css';
import { FeatureNotice } from '../components/FeatureNotice';
import { PickupForm } from '../components/PickupForm';
import { PickupRanking } from '../components/PickupRanking';
import { RecentPickups } from '../components/RecentPickups';
import { usePickupAnnounce } from '../use-pickup-announce';

const STEPS: [string, string, string][] = [
    ['1', 'Registre a retirada', 'Escolha o ponto, informe o peso e a data.'],
    ['2', 'O ponto entra no placar', 'O site soma o peso de cada ponto e mostra o ranking.'],
    ['3', 'Gere o certificado', 'Na tabela do placar, clique em Abrir certificado e imprima.'],
];

export function PickupsPage() {
    useDocumentTitle('Retiradas e placar | Painel Patinhas');
    const points = useAllActivePoints();
    const announce = usePickupAnnounce();

    return (
        <>
            <FeatureNotice feature="page.leaderboard" />
            <div className={styles['card']}>
                <ol className={styles['howSteps']}>
                    {STEPS.map(([number, title, text]) => (
                        <li key={number}>
                            <span className={styles['howNum']}>{number}</span>
                            <div>
                                <b>{title}</b>
                                <p>{text}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
            <div className={styles['cols']}>
                {points.isPending ? (
                    <StateMessage kind="loading">Carregando os pontos...</StateMessage>
                ) : null}
                {points.isError ? (
                    <StateMessage kind="error" onRetry={() => void points.refetch()}>
                        Não foi possível carregar os pontos.
                    </StateMessage>
                ) : null}
                {points.data ? <PickupForm points={points.data} onRegistered={announce} /> : null}
                <RecentPickups />
            </div>
            <PickupRanking />
        </>
    );
}
