import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { ReportsPage } from './ReportsPage';
import { StoriesAdminPage } from './StoriesAdminPage';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

const meta = { page: 1, pageSize: 100, total: 0, totalPages: 1 };

const adminSession = { user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'ADMIN' } };
const editorSession = { user: { ...adminSession.user, role: 'EDITOR' } };

const adminSettings = (hiddenFeatures: string[]) => ({
    gramsPerCap: 2.5,
    kgPriceBrl: 2,
    spayCostBrl: 350,
    goalKg: 175,
    monthlyAverageKg: 0,
    animalsServedYear: null,
    cnpj: null,
    pixKey: null,
    whatsappNumber: null,
    instagramHandle: 'patinhas',
    adoptionUrl: null,
    hiddenFeatures,
    updatedAt: '2026-10-31T12:00:00.000Z',
});

const story = (id: string, title: string, status: 'PUBLISHED' | 'DRAFT', extra = {}) => ({
    id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    body: 'texto',
    excerpt: `Resumo de ${title}`,
    coverUrl: null,
    coverAlt: null,
    publishedAt: status === 'PUBLISHED' ? '2026-10-20T15:00:00.000Z' : null,
    status,
    coverMediaId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...extra,
});

const report = (month: string, status: 'PUBLISHED' | 'DRAFT', totalKg: number) => ({
    id: `r-${month}`,
    month,
    status,
    totalKg,
    capCount: Math.round((totalKg * 1000) / 2.5),
    castrations: Math.floor(totalKg / 175),
    remainingKg: 10,
    outcomeSummary: null,
    publishedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
});

function stub(routes: Record<string, unknown>) {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
            const body = routes[url];
            return Promise.resolve(
                body === undefined
                    ? json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404)
                    : json(body),
            );
        }),
    );
}

function setup(ui: React.ReactNode) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <ToastProvider>{ui}</ToastProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
});

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-31T15:00:00Z'));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('StoriesAdminPage', () => {
    const base = {
        '/api/v1/auth/me': adminSession,
        '/api/v1/admin/site-settings': adminSettings([]),
        '/api/v1/admin/stories?pageSize=100': {
            items: [
                story('s1', 'Toby voltou para casa', 'PUBLISHED', {
                    coverUrl: '/api/v1/media/m1',
                }),
                story('s2', 'Ninhada nova', 'DRAFT'),
                story('s3', 'Feirinha de sábado', 'PUBLISHED'),
            ],
            meta,
        },
    };

    it('shows each story with its state, excerpt and a link to the site only when published', async () => {
        stub(base);
        setup(<StoriesAdminPage />);

        const list = await screen.findByRole('list');
        const rows = within(list).getAllByRole('listitem');
        expect(rows).toHaveLength(3);
        expect(within(rows[0] as HTMLElement).getByText('Publicada')).toBeInTheDocument();
        expect(
            within(rows[0] as HTMLElement).getByText('Resumo de Toby voltou para casa'),
        ).toBeInTheDocument();
        expect(
            within(rows[0] as HTMLElement).getByRole('link', { name: 'Ver no site' }),
        ).toHaveAttribute('href', '/historias/toby-voltou-para-casa');
        expect(within(rows[1] as HTMLElement).getByText('Rascunho')).toBeInTheDocument();
        expect(
            within(rows[1] as HTMLElement).queryByRole('link', { name: 'Ver no site' }),
        ).not.toBeInTheDocument();
    });

    it('counts the stories on the tabs and filters the list', async () => {
        stub(base);
        setup(<StoriesAdminPage />);
        const user = userEvent.setup();

        expect(await screen.findByRole('button', { name: 'Todas (3)' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Publicadas (2)' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Rascunhos (1)' }));

        const rows = within(screen.getByRole('list')).getAllByRole('listitem');
        expect(rows).toHaveLength(1);
        expect(within(rows[0] as HTMLElement).getByText('Ninhada nova')).toBeInTheDocument();
    });

    it('tells the administrator the page is off and links to where to turn it on', async () => {
        stub({ ...base, '/api/v1/admin/site-settings': adminSettings(['page.stories']) });
        setup(<StoriesAdminPage />);

        expect(await screen.findByRole('note')).toHaveTextContent(
            'A página “Histórias de resgate” está desligada no site.',
        );
        expect(screen.getByRole('link', { name: 'Ligar em Páginas e seções' })).toHaveAttribute(
            'href',
            '/admin/visibilidade',
        );
    });

    it('asks an editor to call an administrator instead of linking', async () => {
        stub({
            ...base,
            '/api/v1/auth/me': editorSession,
            '/api/v1/admin/site-settings': adminSettings(['page.stories']),
        });
        setup(<StoriesAdminPage />);

        expect(await screen.findByRole('note')).toHaveTextContent('Peça a um administrador');
        expect(
            screen.queryByRole('link', { name: 'Ligar em Páginas e seções' }),
        ).not.toBeInTheDocument();
    });

    it('does not show the notice while the page is on', async () => {
        stub(base);
        setup(<StoriesAdminPage />);

        await screen.findByRole('list');
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('counts the words and the reading time while writing', async () => {
        stub(base);
        setup(<StoriesAdminPage />);
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('Texto'), 'um dois três quatro');

        expect(screen.getByText('4 palavras, leitura de cerca de 1 min')).toBeInTheDocument();
    });
});

describe('ReportsPage', () => {
    const base = {
        '/api/v1/auth/me': adminSession,
        '/api/v1/admin/site-settings': adminSettings([]),
        '/api/v1/site-settings': {
            ...adminSettings([]),
            collectionPointCount: 10,
            neighborhoodCount: 5,
        },
        '/api/v1/admin/monthly-reports?pageSize=100': {
            items: [
                report('2026-09', 'PUBLISHED', 1500),
                report('2026-08', 'DRAFT', 900),
                report('2026-07', 'PUBLISHED', 1400),
            ],
            meta,
        },
    };

    it('offers the recent months with their state and picks the last one by default', async () => {
        stub(base);
        setup(<ReportsPage />);

        expect(await screen.findByRole('button', { name: 'Set/26, publicado' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: 'Ago/26, rascunho' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Jun/26, falta registrar' })).toBeInTheDocument();
        expect(screen.getByLabelText('Mês')).toHaveValue('2026-09');
    });

    it('switches to a month in one click and loads what was saved for it', async () => {
        stub(base);
        setup(<ReportsPage />);
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Ago/26, rascunho' }));

        expect(screen.getByLabelText('Mês')).toHaveValue('2026-08');
        expect(screen.getByLabelText('Total arrecadado (kg)')).toHaveValue('900');
        expect(screen.getByRole('button', { name: 'Ago/26, rascunho' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('shows what the typed total is worth right away', async () => {
        stub(base);
        setup(<ReportsPage />);
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Jun/26, falta registrar' }));
        await user.type(screen.getByLabelText('Total arrecadado (kg)'), '1500');

        const figures = screen.getByRole('list', { name: 'O que esse total rende' });
        expect(within(figures).getByText('600.000')).toBeInTheDocument();
        expect(within(figures).getByText('8')).toBeInTheDocument();
        expect(within(figures).getByText('castrações pagas')).toBeInTheDocument();
        expect(within(figures).getByText('75 kg')).toBeInTheDocument();
    });

    it('sums the published months of the year and lists the castrations of each month', async () => {
        stub(base);
        setup(<ReportsPage />);

        expect(await screen.findByText(/Em 2026, 2 meses publicados/)).toBeInTheDocument();
        expect(screen.getByText('2.900 kg')).toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(within(table).getByRole('columnheader', { name: 'Castrações' })).toBeInTheDocument();
    });

    it('shows the notice when the page is off', async () => {
        stub({ ...base, '/api/v1/admin/site-settings': adminSettings(['page.report']) });
        setup(<ReportsPage />);

        expect(await screen.findByRole('note')).toHaveTextContent(
            'A página “Para onde vai a tampinha” está desligada no site.',
        );
    });
});
