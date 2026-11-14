import {
    GOAL_KG,
    GOAL_KG_PER_DOSE,
    GRAMS_PER_CAP,
    formatCaps,
    monthlyReportFigures,
} from '@patinhas/shared';
import { useMemo, useState, type FormEvent } from 'react';
import { StateMessage } from '../../components/state-message/StateMessage';
import { Icon } from '../../components/icon/Icon';
import { DEFAULT_INSTAGRAM } from '../../content/site';
import {
    buildPostTexts,
    downloadBlob,
    renderPostPng,
    type PostFormat,
} from '../../features/instagram/instagram-post';
import { formatMonth } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useAdminReports, usePublishReport, useSaveReport } from '../../services/api/admin';
import type { AdminReport, ReportFinance, ReportFinanceKey } from '../../services/api/admin-types';
import { useSiteSettings } from '../../services/api/public';
import styles from '../admin.module.css';
import { AdminInput, AdminTextarea } from '../components/AdminField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { FeatureNotice } from '../components/FeatureNotice';
import { IconButton } from '../components/IconButton';
import { useToast } from '../components/Toast';
import {
    monthState,
    previousMonth,
    recentMonths,
    shortMonthLabel,
    yearSummary,
    type MonthState,
} from '../report-months';

const FINANCE_FIELDS: { key: ReportFinanceKey; label: string; money: boolean }[] = [
    { key: 'animalsVaccinated', label: 'Animais vacinados', money: false },
    { key: 'dosesApplied', label: 'Doses aplicadas', money: false },
    { key: 'doseCostBrl', label: 'Custo médio por dose (R$)', money: true },
    { key: 'medicationSpentBrl', label: 'Gasto com medicação (R$)', money: true },
    { key: 'feedSpentBrl', label: 'Gasto com ração (R$)', money: true },
    { key: 'castrationsDone', label: 'Castrações no mês (se houve)', money: false },
    { key: 'otherIncomeBrl', label: 'Outras receitas: doações e feirinhas (R$)', money: true },
];

function parseFinance(
    values: Partial<Record<ReportFinanceKey, string>>,
    existing: AdminReport | undefined,
): { finance: ReportFinance; invalid: ReportFinanceKey | null } {
    const finance: ReportFinance = {};
    for (const { key, money } of FINANCE_FIELDS) {
        const text = values[key] ?? (existing?.[key] != null ? String(existing[key]) : '');
        if (text.trim() === '') {
            finance[key] = null;
            continue;
        }
        const value = Number(text.replace(',', '.'));
        if (!Number.isFinite(value) || value < 0 || (!money && !Number.isInteger(value))) {
            return { finance, invalid: key };
        }
        finance[key] = value;
    }
    return { finance, invalid: null };
}

const MONTH_STATE_TEXT: Record<MonthState, string> = {
    published: 'publicado',
    draft: 'rascunho',
    missing: 'falta registrar',
};

export function ReportsPage() {
    useDocumentTitle('Prestação de contas | Painel Patinhas');
    const toast = useToast();
    const reports = useAdminReports();
    const settings = useSiteSettings().data;
    const save = useSaveReport();
    const publish = usePublishReport();
    const [toggling, setToggling] = useState<AdminReport | null>(null);

    const [month, setMonth] = useState(previousMonth());

    const [kgInput, setKgInput] = useState<string | null>(null);
    const [outcomeInput, setOutcomeInput] = useState<string | null>(null);
    const [finInput, setFinInput] = useState<Partial<Record<ReportFinanceKey, string>>>({});
    const [finError, setFinError] = useState<ReportFinanceKey | null>(null);
    const [format, setFormat] = useState<PostFormat>('feed');
    const [kgError, setKgError] = useState<string | undefined>();

    const existing = useMemo(
        () => reports.data?.find((item) => item.month === month),
        [reports.data, month],
    );

    const kg = kgInput ?? (existing ? String(existing.totalKg) : '');
    const outcome = outcomeInput ?? existing?.outcomeSummary ?? '';

    const totalKg = Number(kg.replace(',', '.'));
    const validKg = kg.trim() !== '' && Number.isFinite(totalKg) && totalKg >= 0;
    const goalKg = settings?.goalKg ?? GOAL_KG;
    const doseGoalKg = settings?.doseGoalKg ?? GOAL_KG_PER_DOSE;
    const gramsPerCap = settings?.gramsPerCap ?? GRAMS_PER_CAP;
    const instagram = settings?.instagramHandle ?? DEFAULT_INSTAGRAM;
    const texts = buildPostTexts({
        month,
        totalKg: validKg ? totalKg : 0,
        goalKg,
        doseKg: doseGoalKg,
        gramsPerCap,
        outcome,
        instagram,
    });

    const figures = validKg ? monthlyReportFigures(totalKg, goalKg, gramsPerCap, doseGoalKg) : null;
    const summary = yearSummary(reports.data ?? [], month.slice(0, 4), goalKg, doseGoalKg);

    function chooseMonth(next: string) {
        setMonth(next);
        setKgInput(null);
        setOutcomeInput(null);
        setFinInput({});
        setFinError(null);
    }

    function persist(thenPublish: boolean) {
        if (!validKg) {
            setKgError('Escreva o total em kg (zero ou mais).');
            return;
        }
        const { finance, invalid } = parseFinance(finInput, existing);
        setFinError(invalid);
        if (invalid) return;
        setKgError(undefined);
        save.mutate(
            {
                ...(existing ? { id: existing.id } : {}),
                month,
                totalKg,
                outcomeSummary: outcome.trim(),
                finance,
            },
            {
                onSuccess: (saved) => {
                    if (!thenPublish) {
                        toast('Rascunho salvo.');
                        return;
                    }
                    publish.mutate(
                        { id: saved.id, publish: true },
                        {
                            onSuccess: () => toast('Mês publicado na página Contas do site.'),
                            onError: () => toast('Salvou, mas não foi possível publicar.'),
                        },
                    );
                },
                onError: () => toast('Não foi possível salvar.'),
            },
        );
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        persist(true);
    }

    async function download() {
        try {
            downloadBlob(
                await renderPostPng(texts, format, instagram),
                `prestacao-de-contas-${month}.png`,
            );
            toast('Imagem baixada.');
        } catch {
            toast('Não foi possível gerar a imagem neste navegador.');
        }
    }

    async function copyCaption() {
        try {
            await navigator.clipboard.writeText(texts.caption);
            toast('Legenda copiada.');
        } catch {
            toast('Selecione e copie manualmente.');
        }
    }

    function edit(report: AdminReport) {
        setMonth(report.month);
        setKgInput(null);
        setOutcomeInput(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const busy = save.isPending || publish.isPending;

    return (
        <>
            <FeatureNotice feature="page.report" />
            <div className={styles['cols']}>
                <form className={styles['card']} onSubmit={submit} noValidate>
                    <div className={styles['cardHead']}>
                        <h2>Registrar o mês</h2>
                        {existing ? (
                            <span
                                className={`${styles['chip']} ${existing.status === 'PUBLISHED' ? styles['chipDone'] : styles['chipGray']}`}
                            >
                                {existing.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                            </span>
                        ) : null}
                    </div>
                    <div className={styles['monthChips']} role="group" aria-label="Meses recentes">
                        {recentMonths().map((item) => {
                            const state = monthState(item, reports.data ?? []);
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    className={styles['monthChip']}
                                    aria-pressed={item === month}
                                    aria-label={`${shortMonthLabel(item)}, ${MONTH_STATE_TEXT[state]}`}
                                    onClick={() => chooseMonth(item)}
                                >
                                    <span className={styles['monthDot']} data-state={state} />
                                    {shortMonthLabel(item)}
                                </button>
                            );
                        })}
                    </div>
                    <p className={styles['monthLegend']} aria-hidden="true">
                        <span>
                            <i className={styles['monthDot']} data-state="published" /> publicado
                        </span>
                        <span>
                            <i className={styles['monthDot']} data-state="draft" /> rascunho
                        </span>
                        <span>
                            <i className={styles['monthDot']} data-state="missing" /> falta
                            registrar
                        </span>
                    </p>
                    <div className={`${styles['fgrid']} ${styles['one']}`}>
                        <AdminInput
                            label="Mês"
                            type="month"
                            value={month}
                            onChange={(e) => chooseMonth(e.target.value)}
                        />
                        <AdminInput
                            label="Total arrecadado (kg)"
                            inputMode="decimal"
                            value={kg}
                            onChange={(e) => setKgInput(e.target.value)}
                            error={kgError}
                        />
                        {figures ? (
                            <ul className={styles['figures']} aria-label="O que esse total rende">
                                <li className={styles['figure']}>
                                    <b>{formatCaps(figures.capCount)}</b>
                                    <span>tampinhas</span>
                                </li>
                                <li className={styles['figure']}>
                                    <b>{figures.doses}</b>
                                    <span>
                                        {figures.doses === 1
                                            ? 'dose de vacina paga'
                                            : 'doses de vacina pagas'}
                                    </span>
                                </li>
                                <li className={styles['figure']}>
                                    <b>
                                        {figures.remainingKgToNextDose.toLocaleString('pt-BR', {
                                            maximumFractionDigits: 1,
                                        })}{' '}
                                        kg
                                    </b>
                                    <span>para a próxima dose</span>
                                </li>
                            </ul>
                        ) : null}
                        {FINANCE_FIELDS.map(({ key, label, money }) => (
                            <AdminInput
                                key={key}
                                label={`${label} (opcional)`}
                                inputMode={money ? 'decimal' : 'numeric'}
                                value={
                                    finInput[key] ??
                                    (existing?.[key] != null ? String(existing[key]) : '')
                                }
                                onChange={(e) => setFinInput((cur) => ({ ...cur, [key]: e.target.value }))}
                                error={
                                    finError === key
                                        ? money
                                            ? 'Informe um valor, como 120,50.'
                                            : 'Informe um número inteiro.'
                                        : undefined
                                }
                            />
                        ))}
                        <AdminTextarea
                            label="No que virou (opcional)"
                            rows={3}
                            value={outcome}
                            onChange={(e) => setOutcomeInput(e.target.value)}
                            placeholder="Ex.: 220 animais vacinados e ração para 20 dias"
                        />
                    </div>
                    <div className={styles['actions']}>
                        <button className={styles['btn']} type="submit" disabled={busy}>
                            {busy ? 'Salvando...' : 'Publicar no site'}
                        </button>
                        <button
                            className={`${styles['btn']} ${styles['ghost']}`}
                            type="button"
                            disabled={busy}
                            onClick={() => persist(false)}
                        >
                            Salvar rascunho
                        </button>
                    </div>
                </form>

                <div className={styles['card']}>
                    <div className={styles['cardHead']}>
                        <h2>Imagem para o Instagram</h2>
                        <select
                            aria-label="Formato"
                            className={styles['autoWidth']}
                            value={format}
                            onChange={(e) => setFormat(e.target.value as PostFormat)}
                        >
                            <option value="feed">Feed (quadrado)</option>
                            <option value="story">Stories (vertical)</option>
                        </select>
                    </div>
                    <div className={styles['igWrap']}>
                        <div
                            className={`${styles['ig']} ${format === 'feed' ? styles['igFeed'] : styles['igStory']}`}
                        >
                            <div className={styles['igIn']}>
                                <span className={styles['igKick']}>Prestação de contas</span>
                                <b className={styles['igBig']}>{texts.headline}</b>
                                <span className={styles['igSub']}>{texts.subtitle}</span>
                                <span className={styles['igHandle']}>@{instagram}</span>
                            </div>
                        </div>
                    </div>
                    <AdminTextarea label="Legenda pronta" rows={4} readOnly value={texts.caption} />
                    <div className={styles['actions']}>
                        <button
                            className={styles['btn']}
                            type="button"
                            onClick={() => void download()}
                        >
                            <Icon name="download" /> Baixar imagem
                        </button>
                        <button
                            className={`${styles['btn']} ${styles['ghost']}`}
                            type="button"
                            onClick={() => void copyCaption()}
                        >
                            <Icon name="copy" /> Copiar legenda
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles['card']}>
                <div className={styles['cardHead']}>
                    <h2>Meses registrados</h2>
                </div>
                {reports.isPending ? (
                    <StateMessage kind="loading">Carregando...</StateMessage>
                ) : null}
                {reports.isError ? (
                    <StateMessage kind="error" onRetry={() => void reports.refetch()}>
                        Não foi possível carregar os meses.
                    </StateMessage>
                ) : null}
                {summary.months > 0 ? (
                    <p className={styles['yearBar']}>
                        Em {month.slice(0, 4)}, {summary.months}{' '}
                        {summary.months === 1 ? 'mês publicado' : 'meses publicados'}:{' '}
                        <b>{summary.kg.toLocaleString('pt-BR')} kg</b>, cerca de{' '}
                        <b>{summary.doses}</b>{' '}
                        {summary.doses === 1 ? 'dose de vacina' : 'doses de vacina'}.
                    </p>
                ) : null}
                {reports.data ? (
                    reports.data.length === 0 ? (
                        <EmptyState
                            icon="chart"
                            title="Nenhum mês registrado"
                            hint="Ao fechar o primeiro mês, os números aparecem na página de prestação de contas."
                        />
                    ) : (
                        <div className={styles['tableWrap']}>
                            <table className={styles['table']}>
                                <thead>
                                    <tr>
                                        <th>Mês</th>
                                        <th>Arrecadado</th>
                                        <th>Doses de vacina</th>
                                        <th>Resumo</th>
                                        <th>Status</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.data.map((report) => (
                                        <tr key={report.id}>
                                            <td data-label="Mês">{formatMonth(report.month)}</td>
                                            <td data-label="Arrecadado">
                                                {report.totalKg.toLocaleString('pt-BR')} kg
                                            </td>
                                            <td data-label="Doses de vacina">{report.doses}</td>
                                            <td data-label="Resumo">
                                                {report.outcomeSummary ?? '-'}
                                            </td>
                                            <td data-label="Status">
                                                <span
                                                    className={`${styles['chip']} ${report.status === 'PUBLISHED' ? styles['chipDone'] : styles['chipGray']}`}
                                                >
                                                    {report.status === 'PUBLISHED'
                                                        ? 'Publicado'
                                                        : 'Rascunho'}
                                                </span>
                                            </td>
                                            <td className={styles['right']}>
                                                <div className={styles['iconRow']}>
                                                    <IconButton
                                                        icon="pencil"
                                                        label="Editar relatório"
                                                        onClick={() => edit(report)}
                                                    />
                                                    <IconButton
                                                        icon={
                                                            report.status === 'PUBLISHED'
                                                                ? 'eyeOff'
                                                                : 'eye'
                                                        }
                                                        label={
                                                            report.status === 'PUBLISHED'
                                                                ? 'Tirar do site'
                                                                : 'Publicar no site'
                                                        }
                                                        disabled={publish.isPending}
                                                        onClick={() => setToggling(report)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : null}
            </div>
            {toggling ? (
                <ConfirmDialog
                    title={
                        toggling.status === 'PUBLISHED'
                            ? 'Tirar o relatório do site?'
                            : 'Publicar o relatório no site?'
                    }
                    message={
                        toggling.status === 'PUBLISHED'
                            ? `O relatório de ${formatMonth(toggling.month)} deixa de aparecer na página de prestação de contas.`
                            : `O relatório de ${formatMonth(toggling.month)} fica visível para todo mundo na página de prestação de contas.`
                    }
                    confirmLabel={toggling.status === 'PUBLISHED' ? 'Tirar do site' : 'Publicar'}
                    tone={toggling.status === 'PUBLISHED' ? 'danger' : 'default'}
                    pending={publish.isPending}
                    onCancel={() => setToggling(null)}
                    onConfirm={() => {
                        const wasPublished = toggling.status === 'PUBLISHED';
                        publish.mutate(
                            { id: toggling.id, publish: !wasPublished },
                            {
                                onSuccess: () =>
                                    toast(wasPublished ? 'Tirado do site.' : 'Publicado no site.'),
                                onError: () => toast('Não foi possível alterar.'),
                            },
                        );
                        setToggling(null);
                    }}
                />
            ) : null}
        </>
    );
}
