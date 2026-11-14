import { useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { PageHero } from '../../components/page-hero/PageHero';
import { StateMessage } from '../../components/state-message/StateMessage';
import { useDocumentTitle } from '../../lib/use-document-title';
import { Feature } from '../../features/site-features/Feature';
import { useLeaderboard } from '../../services/api/public';
import type { LeaderboardPeriod } from '../../services/api/types';
import pageStyles from '../shared/page.module.css';
import { Podium } from './Podium';
import { RankList } from './RankList';
import { SummaryStrip } from './SummaryStrip';
import { PERIOD_TABS, describePeriod } from './period';
import styles from './leaderboard.module.css';

const PODIUM_SIZE = 3;

export function LeaderboardPage() {
    useDocumentTitle('Placar dos pontos de coleta | Patinhas Carentes Joinville');
    const [period, setPeriod] = useState<LeaderboardPeriod>('month');
    const board = useLeaderboard(period);
    const data = board.data;
    const topKg = data?.items[0]?.totalKg ?? 0;

    return (
        <>
            <PageHero kicker="Placar de coleta" title="Quem mais ajuda os bichinhos de Joinville.">
                Cada escola, empresa e loja que guarda tampinhas aparece aqui com o que já entregou.
                Quanto mais tampinhas, mais vacinas, ração e cuidado.
            </PageHero>

            <div className={styles['tabs']} role="group" aria-label="Período do placar">
                {PERIOD_TABS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={period === value}
                        onClick={() => setPeriod(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {board.isPending ? (
                <StateMessage kind="loading">Carregando o placar...</StateMessage>
            ) : null}
            {board.isError ? (
                <StateMessage kind="error" onRetry={() => void board.refetch()}>
                    Não foi possível carregar o placar agora.
                </StateMessage>
            ) : null}

            {data ? (
                <>
                    <SummaryStrip data={data} />
                    {data.items.length === 0 ? (
                        <div className={styles['empty']}>
                            <h2>Ainda não há retiradas {describePeriod(period, data.since)}</h2>
                            <p>
                                Assim que a equipe recolher as tampinhas de um ponto, ele entra no
                                placar. Seu espaço pode ser o primeiro.
                            </p>
                        </div>
                    ) : (
                        <>
                            <Podium entries={data.items.slice(0, PODIUM_SIZE)} />
                            {data.items.length > PODIUM_SIZE ? (
                                <RankList entries={data.items.slice(PODIUM_SIZE)} topKg={topKg} />
                            ) : null}
                        </>
                    )}
                </>
            ) : null}

            <Feature name="page.school">
                <div className={pageStyles['cta']}>
                    <div>
                        <h2>Quer ver o seu nome aqui?</h2>
                        <p>
                            Guarde as tampinhas da sua escola, empresa ou loja. A equipe busca e
                            você recebe um certificado para imprimir.
                        </p>
                    </div>
                    <Link
                        className={buttonClass({ variant: 'sun', size: 'xl' })}
                        to="/escolas-e-empresas"
                    >
                        Quero ser um ponto
                    </Link>
                </div>
            </Feature>
        </>
    );
}
