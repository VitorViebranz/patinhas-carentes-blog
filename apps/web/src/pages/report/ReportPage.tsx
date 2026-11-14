import { GOAL_KG_PER_DOSE, describeReais } from '@patinhas/shared';
import { Link } from 'react-router-dom';
import { ApiError } from '../../services/api/client';
import { buttonClass } from '../../components/button/Button';
import { PawPrint } from '../../components/decor/PawPrint';
import { Icon } from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/icon-data';
import { PageHero } from '../../components/page-hero/PageHero';
import { StateMessage } from '../../components/state-message/StateMessage';
import { formatMonth } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import { Feature } from '../../features/site-features/Feature';
import { useMonthlyReports, useSiteSettings } from '../../services/api/public';
import type { MonthlyReport, SiteSettings } from '../../services/api/types';
import pageStyles from '../shared/page.module.css';
import styles from './report.module.css';

const LADDER: [IconName, string, string][] = [
    ['cap', 'Você doa', 'Deixa as tampinhas em um ponto de coleta.'],
    ['truck', 'A equipe busca', 'Voluntários recolhem em cada ponto.'],
    ['recycle', 'Vai para a reciclagem', 'O plástico é vendido e vira dinheiro.'],
    ['paw', 'Vira cuidado', 'Ração, vacina, medicação e atendimento veterinário.'],
];

const RESULTS: [IconName, string, string][] = [
    [
        'heart',
        'Vacinação antirrábica gratuita',
        'Em parceria com a Agropet Silva, vacinação em massa aberta ao público, paga 100% com tampinhas.',
    ],
    [
        'paw',
        'Campanha de castração',
        'Grande ação em uma região de frequente abandono, com castrações, transporte e cuidados depois da cirurgia.',
    ],
    [
        'store',
        'Feirinhas de adoção',
        'Geralmente aos sábados, em shoppings, com animais vacinados, microchipados e castrados.',
    ],
    [
        'school',
        'Palestras em escolas',
        'Conscientização em sala de aula. As escolas que participam viram ponto de coleta oficial.',
    ],
];

const CHART_MONTHS = 12;
const MIN_BAR_PERCENT = 6;

const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

function dosesText(count: number): string {
    return count === 1 ? '1 dose de vacina' : `${count.toLocaleString('pt-BR')} doses de vacina`;
}

function MonthFigures({ report }: { report: MonthlyReport }) {
    const rows: [string, string][] = [];
    if (report.animalsVaccinated !== null)
        rows.push([
            'Animais vacinados',
            report.animalsVaccinated.toLocaleString('pt-BR'),
        ]);
    if (report.dosesApplied !== null)
        rows.push(['Doses aplicadas', report.dosesApplied.toLocaleString('pt-BR')]);
    if (report.medicationSpentBrl !== null)
        rows.push(['Gasto com medicação', describeReais(report.medicationSpentBrl)]);
    if (report.feedSpentBrl !== null)
        rows.push(['Gasto com ração', describeReais(report.feedSpentBrl)]);
    if (report.castrationsDone !== null && report.castrationsDone > 0)
        rows.push(['Castrações', report.castrationsDone.toLocaleString('pt-BR')]);
    if (report.otherIncomeBrl !== null)
        rows.push(['Outras receitas (doações e feirinhas)', describeReais(report.otherIncomeBrl)]);
    if (rows.length === 0) return null;
    return (
        <dl className={pageStyles['fine']} aria-label="Detalhes do mês">
            {rows.map(([label, value]) => (
                <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                        <b>{value}</b>
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function shortMonth(month: string): string {
    const name = formatMonth(month).split(' ')[0] ?? month;
    return `${name.slice(0, 3)}/${month.slice(2, 4)}`;
}

function Journey() {
    return (
        <section className={styles['journey']} aria-labelledby="journey-title">
            <PawPrint className={styles['journeyPaw']} />
            <p className={styles['kicker']}>O caminho</p>
            <h2 id="journey-title">Da sua tampinha ao cuidado</h2>
            <ol className={styles['steps']}>
                {LADDER.map(([icon, title, text], index) => (
                    <li key={title} className={styles['step']}>
                        <div className={styles['stepTop']}>
                            <span className={styles['stepNum']}>{index + 1}</span>
                            <span className={styles['stepIcon']}>
                                <Icon name={icon} />
                            </span>
                        </div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function MonthCard({ report, goalKg }: { report: MonthlyReport; goalKg: number }) {
    const doseGoal = goalKg;
    const percent = Math.min(
        100,
        Math.max(0, Math.round(((doseGoal - report.remainingKgToNextDose) / doseGoal) * 100)),
    );
    return (
        <div className={styles['month']}>
            <h2>{formatMonth(report.month)}</h2>
            <div className={styles['bigkg']}>{kg(report.totalKg)}</div>
            <p>de tampinhas arrecadadas.</p>
            <div
                className={styles['meter']}
                role="img"
                aria-label={`${percent}% do caminho até a próxima dose de vacina`}
            >
                <i style={{ width: `${percent}%` }} />
            </div>
            <div className={styles['paid']}>
                <Icon name="check" />
                <p>
                    {report.doses > 0 ? (
                        <>
                            <b>Pagou {dosesText(report.doses)}.</b>{' '}
                        </>
                    ) : null}
                    Faltam {kg(report.remainingKgToNextDose)} para a{' '}
                    {report.doses > 0 ? 'próxima' : 'primeira'} dose de vacina.
                </p>
            </div>
            <MonthFigures report={report} />
            {report.outcomeSummary ? (
                <p className={pageStyles['fine']}>{report.outcomeSummary}</p>
            ) : null}
        </div>
    );
}

function AverageCard({ settings }: { settings: SiteSettings }) {
    if (!(settings.monthlyAverageKg > 0)) return null;
    const doses = Math.floor(settings.monthlyAverageKg / settings.doseGoalKg);
    return (
        <div className={styles['avg']}>
            <PawPrint className={styles['avgPaw']} />
            <h2>Quanto arrecadamos por mês</h2>
            <div className={`${styles['bigkg']} ${styles['bigkgLight']}`}>
                {kg(settings.monthlyAverageKg)}
            </div>
            <p>
                de tampinhas por mês, em média.
                {doses > 0 ? (
                    <>
                        {' '}
                        Isso paga cerca de <b>{dosesText(doses)}</b> por mês.
                    </>
                ) : null}
            </p>
            <p className={styles['avgFine']}>
                Cálculo: o quilo rende {describeReais(settings.kgPriceBrl)} e uma dose de vacina custa
                em média {describeReais(settings.vaccineDoseCostBrl)} (cerca de{' '}
                {kg(settings.doseGoalKg)}). As tampinhas cobrem parte dos gastos; o restante vem de
                doações e feirinhas. Todo mês a equipe publica aqui o total do mês.
            </p>
        </div>
    );
}

function LatestMonth() {
    const reports = useMonthlyReports();
    const settings = useSiteSettings();
    if (reports.isPending)
        return <StateMessage kind="loading">Carregando as contas...</StateMessage>;
    if (reports.isError) {
        return (
            <StateMessage kind="error" onRetry={() => void reports.refetch()}>
                {reports.error instanceof ApiError
                    ? reports.error.message
                    : 'Não foi possível carregar.'}
            </StateMessage>
        );
    }
    const [latest] = reports.data;
    if (!latest) {
        return (
            <div className={pageStyles['empty']}>
                <StateMessage kind="empty">
                    O primeiro resumo do mês será publicado em breve.
                </StateMessage>
            </div>
        );
    }
    return <MonthCard report={latest} goalKg={settings.data?.doseGoalKg ?? GOAL_KG_PER_DOSE} />;
}

function MonthChart() {
    const reports = useMonthlyReports();
    const data = reports.data ?? [];
    if (data.length < 2) return null;
    const ordered = [...data].sort((a, b) => a.month.localeCompare(b.month)).slice(-CHART_MONTHS);
    const max = Math.max(...ordered.map((item) => item.totalKg), 1);
    return (
        <section className={styles['chartWrap']} aria-labelledby="chart-title">
            <p className={styles['kicker']}>Mês a mês</p>
            <h2 id="chart-title">Quanto arrecadamos em cada mês</h2>
            <ol className={styles['chart']}>
                {ordered.map((item, index) => (
                    <li key={item.month} data-latest={index === ordered.length - 1}>
                        <b>{kg(item.totalKg)}</b>
                        <span
                            className={styles['bar']}
                            aria-hidden="true"
                            style={{
                                height: `${Math.max(MIN_BAR_PERCENT, (item.totalKg / max) * 100)}%`,
                            }}
                        />
                        <span className={styles['barLabel']}>{shortMonth(item.month)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function Results() {
    return (
        <section className={styles['results']} aria-labelledby="results-title">
            <p className={styles['kicker']}>Resultados</p>
            <h2 id="results-title">O que as tampinhas já fizeram</h2>
            <div className={styles['resultGrid']}>
                {RESULTS.map(([icon, title, text]) => (
                    <article key={title} className={styles['result']}>
                        <span className={styles['resultIcon']}>
                            <Icon name={icon} />
                        </span>
                        <h3>{title}</h3>
                        <p>{text}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

export function ReportPage() {
    useDocumentTitle('Para onde vai a tampinha | Patinhas Carentes Joinville');
    const settings = useSiteSettings();
    return (
        <>
            <PageHero
                kicker="Para onde vai a tampinha"
                title="Você sabe onde cada tampinha termina."
            />

            <Journey />

            <section className={styles['numbers']} aria-labelledby="numbers-title">
                <p className={styles['kicker']}>Os números</p>
                <h2 id="numbers-title">Quanto as tampinhas já renderam</h2>
                <div className={styles['numGrid']}>
                    {settings.data ? <AverageCard settings={settings.data} /> : null}
                    <LatestMonth />
                </div>
            </section>

            <MonthChart />

            <Results />

            <Feature name="home.points">
                <div className={pageStyles['cta']}>
                    <h2>Cada tampinha conta.</h2>
                    <p>Junte as suas e deixe no ponto de coleta mais perto de você.</p>
                    <Link
                        className={buttonClass({ variant: 'sun', size: 'xl' })}
                        to={{ pathname: '/', hash: '#achar' }}
                    >
                        Achar um ponto de coleta
                    </Link>
                </div>
            </Feature>
        </>
    );
}
