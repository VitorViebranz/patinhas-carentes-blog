import { GOAL_KG_PER_DOSE } from '@patinhas/shared';
import { Link } from 'react-router-dom';
import { PawPrint } from '../../components/decor/PawPrint';
import { Icon } from '../../components/icon/Icon';
import { EmptyState } from '../components/EmptyState';
import { StateMessage } from '../../components/state-message/StateMessage';
import { formatMonth } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useAdminRequests, useDashboard, useSession } from '../../services/api/admin';
import { useMonthlyReports, useSiteSettings } from '../../services/api/public';
import styles from '../admin.module.css';
import { REQUEST_TYPE_LABEL, formatDateTime, requestTitle } from '../labels';

const REPORT_STATUS = {
    MISSING: 'ainda não registrado',
    DRAFT: 'em rascunho, falta publicar',
    PUBLISHED: 'publicado',
} as const;

export function DashboardPage() {
    useDocumentTitle('Visão geral | Painel Patinhas');
    const dashboard = useDashboard();
    const requests = useAdminRequests('NEW', 1);
    const reports = useMonthlyReports();
    const settings = useSiteSettings();
    const session = useSession().data;

    if (dashboard.isPending)
        return <StateMessage kind="loading">Carregando o painel...</StateMessage>;
    if (dashboard.isError) {
        return (
            <StateMessage kind="error" onRetry={() => void dashboard.refetch()}>
                Não foi possível carregar o painel.
            </StateMessage>
        );
    }

    const d = dashboard.data;
    const pending = d.pendingReport;
    const latest = reports.data?.[0];
    const doseGoalKg = settings.data?.doseGoalKg ?? GOAL_KG_PER_DOSE;
    const percent = latest
        ? Math.min(100, Math.max(0, Math.round(((doseGoalKg - latest.remainingKgToNextDose) / doseGoalKg) * 100)))
        : 0;
    const todo: { text: string; to: string }[] = [];
    if (d.newHelpRequests > 0)
        todo.push({
            text: `${d.newHelpRequests} ${d.newHelpRequests === 1 ? 'pedido' : 'pedidos'} para responder`,
            to: '/admin/solicitacoes',
        });
    if (pending.status !== 'PUBLISHED')
        todo.push({
            text: `${formatMonth(pending.month)}: prestação de contas ${REPORT_STATUS[pending.status]}`,
            to: '/admin/contas',
        });
    if (d.pointsWithoutPhone > 0)
        todo.push({
            text: `${d.pointsWithoutPhone} ${d.pointsWithoutPhone === 1 ? 'ponto' : 'pontos'} sem telefone`,
            to: '/admin/pontos?filtro=semtel',
        });
    if (d.approximateLocationPoints > 0)
        todo.push({
            text: `${d.approximateLocationPoints} ${d.approximateLocationPoints === 1 ? 'ponto' : 'pontos'} com posição aproximada`,
            to: '/admin/pontos?filtro=aprox',
        });

    const firstName = session?.name.split(' ')[0] ?? '';

    return (
        <>
            <section className={styles['welcome']}>
                <PawPrint className={styles['welcomePaw']} />
                <div>
                    <h2>Olá, {firstName}!</h2>
                    <p>
                        {todo.length > 0
                            ? `Você tem ${todo.length} ${todo.length === 1 ? 'coisa' : 'coisas'} para ver hoje.`
                            : 'Tudo em dia por aqui. Bom trabalho!'}
                    </p>
                </div>
                <div className={styles['welcomeActions']}>
                    <Link className={styles['btn']} to="/admin/pontos?novo=1">
                        <Icon name="plus" /> Novo ponto
                    </Link>
                    <Link
                        className={`${styles['btn']} ${styles['ghost']}`}
                        to="/admin/solicitacoes"
                    >
                        Ver pedidos
                    </Link>
                </div>
            </section>

            <div className={styles['kpis']}>
                <Link className={styles['kpi']} to="/admin/pontos">
                    <span className={styles['kIcon']}>
                        <Icon name="pin" />
                    </span>
                    <span className={styles['kl']}>Pontos de coleta</span>
                    <b>{d.activePoints}</b>
                    <span className={styles['kh']}>na lista do site</span>
                </Link>
                <Link className={styles['kpi']} to="/admin/solicitacoes">
                    <span className={styles['kIcon']}>
                        <Icon name="inbox" />
                    </span>
                    <span className={styles['kl']}>Pedidos aguardando</span>
                    <b className={d.newHelpRequests > 0 ? styles['warnText'] : ''}>
                        {d.newHelpRequests}
                    </b>
                    <span className={styles['kh']}>escolas, empresas e voluntários</span>
                </Link>
                <div className={styles['kpi']}>
                    <span className={styles['kIcon']}>
                        <Icon name="chart" />
                    </span>
                    <span className={styles['kl']}>Último mês publicado</span>
                    <b>{latest ? `${latest.totalKg.toLocaleString('pt-BR')} kg` : '-'}</b>
                    <span className={styles['kh']}>
                        {latest ? formatMonth(latest.month) : 'nenhum ainda'}
                    </span>
                </div>
                <Link className={styles['kpi']} to="/admin/contas">
                    <span className={styles['kIcon']}>
                        <Icon name="book" />
                    </span>
                    <span className={styles['kl']}>Prestação de contas</span>
                    <b className={styles['small']}>{formatMonth(pending.month)}</b>
                    <span className={styles['kh']}>{REPORT_STATUS[pending.status]}</span>
                </Link>
            </div>

            <div className={styles['cols']}>
                <div className={styles['card']}>
                    <div className={styles['cardHead']}>
                        <h2>Pedidos recentes</h2>
                        <Link className={styles['link']} to="/admin/solicitacoes">
                            Ver todos
                        </Link>
                    </div>
                    {requests.data && requests.data.items.length > 0 ? (
                        <div className={styles['tableWrap']}>
                            <table className={styles['table']}>
                                <thead>
                                    <tr>
                                        <th>Quem pediu</th>
                                        <th>Tipo</th>
                                        <th>Recebido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.data.items.slice(0, 5).map((item) => (
                                        <tr key={item.id}>
                                            <td data-label="Quem pediu">
                                                <b>{requestTitle(item)}</b>
                                            </td>
                                            <td data-label="Tipo">
                                                {REQUEST_TYPE_LABEL[item.type]}
                                            </td>
                                            <td data-label="Recebido">
                                                {formatDateTime(item.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon="check"
                            title="Nenhum pedido novo"
                            hint="Tudo respondido por enquanto."
                        />
                    )}
                </div>
                <div className={styles['card']}>
                    <div className={styles['cardHead']}>
                        <h2>Pendências</h2>
                    </div>
                    {todo.length === 0 ? (
                        <p className={styles['muted']}>Tudo em dia.</p>
                    ) : (
                        <ul className={styles['todo']}>
                            {todo.map((item) => (
                                <li key={item.text}>
                                    <i className={styles['dot']} />
                                    <span>{item.text}</span>
                                    <Link className={styles['link']} to={item.to}>
                                        Abrir
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {latest ? (
                <div className={styles['card']}>
                    <div className={styles['cardHead']}>
                        <h2>Doses de vacina pagas no último mês</h2>
                        <span className={styles['muted']}>
                            {latest.totalKg.toLocaleString('pt-BR')} kg em{' '}
                            {formatMonth(latest.month)}
                        </span>
                    </div>
                    <div
                        className={styles['bar']}
                        role="img"
                        aria-label={`${percent}% do caminho até a próxima dose de vacina`}
                    >
                        <i style={{ width: `${percent}%` }} />
                    </div>
                    <p className={`${styles['muted']} ${styles['gapTop8']}`}>
                        {latest.doses > 0
                            ? `${latest.doses.toLocaleString('pt-BR')} doses de vacina pagas. `
                            : ''}
                        Faltam {latest.remainingKgToNextDose.toLocaleString('pt-BR')} kg para a
                        próxima (cerca de {doseGoalKg.toLocaleString('pt-BR')} kg cada).
                    </p>
                </div>
            ) : null}

            <div className={styles['quick']}>
                <Link className={styles['btn']} to="/admin/pontos?novo=1">
                    <Icon name="plus" /> Novo ponto de coleta
                </Link>
                <Link className={`${styles['btn']} ${styles['ghost']}`} to="/admin/retiradas">
                    <Icon name="truck" /> Registrar retirada
                </Link>
                <Link className={`${styles['btn']} ${styles['ghost']}`} to="/admin/contas">
                    <Icon name="chart" /> Registrar o mês
                </Link>
                <Link className={`${styles['btn']} ${styles['ghost']}`} to="/admin/historias">
                    <Icon name="file" /> Escrever história
                </Link>
                {session?.role === 'ADMIN' ? (
                    <Link className={`${styles['btn']} ${styles['ghost']}`} to="/admin/equipe">
                        <Icon name="dash" /> Números do site
                    </Link>
                ) : null}
            </div>
        </>
    );
}
