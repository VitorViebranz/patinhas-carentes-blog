import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CertificatePage } from '../certificate/CertificatePage';
import { LeaderboardPage } from './LeaderboardPage';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

function stubApi(routes: Record<string, () => Response>) {
    const mock = vi.fn((url: string) => {
        const handler = routes[url];
        return Promise.resolve(
            handler ? handler() : json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
        );
    });
    vi.stubGlobal('fetch', mock);
    return mock;
}

function renderAt(path: string, element: React.ReactNode, route = path) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path={route} element={element} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

const entry = (rank: number, name: string, totalKg: number) => ({
    rank,
    pointId: `p${rank}`,
    name,
    neighborhood: 'Centro',
    category: 'EDUCATION',
    totalKg,
    pickups: 2,
    lastPickupOn: '2026-10-20',
});

const board = (period: string, items: unknown[], since: string | null = '2026-10-01') => ({
    period,
    since,
    totalKg: 150,
    pickups: 6,
    pointCount: items.length,
    capCount: 60_000,
    castrations: 0,
    doses: 0,
    remainingKg: 25,
    items,
});

const FOUR = [
    entry(1, 'Escola Sol', 60),
    entry(2, 'Loja Lua', 50),
    entry(3, 'Colégio Alfa', 30),
    entry(4, 'Padaria Trigo', 10),
];

afterEach(() => vi.unstubAllGlobals());

describe('LeaderboardPage', () => {
    it('shows the summary, the podium with the first three and the rest in a list', async () => {
        stubApi({ '/api/v1/leaderboard?period=month': () => json(board('month', FOUR)) });
        renderAt('/', <LeaderboardPage />);

        const podium = await screen.findByRole('list', { name: 'Os três primeiros' });
        expect(within(podium).getAllByRole('heading', { level: 3 })).toHaveLength(3);
        expect(within(podium).getByText('Escola Sol')).toBeInTheDocument();
        expect(within(podium).queryByText('Padaria Trigo')).not.toBeInTheDocument();

        const rest = screen.getByRole('list', { name: 'Demais pontos' });
        expect(within(rest).getByText('Padaria Trigo')).toBeInTheDocument();

        const summary = screen.getByRole('region', { name: 'Resumo do período' });
        expect(within(summary).getByText('150 kg')).toBeInTheDocument();
        expect(summary).toHaveTextContent('em outubro de 2026');
    });

    it('links each point to its certificate', async () => {
        stubApi({ '/api/v1/leaderboard?period=month': () => json(board('month', FOUR)) });
        renderAt('/', <LeaderboardPage />);

        const podium = await screen.findByRole('list', { name: 'Os três primeiros' });
        expect(within(podium).getAllByRole('link', { name: 'Ver certificado' })[0]).toHaveAttribute(
            'href',
            '/certificado/p1',
        );
        expect(screen.getByRole('link', { name: 'Padaria Trigo' })).toHaveAttribute(
            'href',
            '/certificado/p4',
        );
    });

    it('asks for the year when the tab changes', async () => {
        const mock = stubApi({
            '/api/v1/leaderboard?period=month': () => json(board('month', FOUR)),
            '/api/v1/leaderboard?period=year': () =>
                json(board('year', [entry(1, 'Só no ano', 99)], '2026-01-01')),
        });
        renderAt('/', <LeaderboardPage />);
        await screen.findByText('Escola Sol');

        await userEvent.click(screen.getByRole('button', { name: 'Este ano' }));

        expect(await screen.findByText('Só no ano')).toBeInTheDocument();
        expect(mock).toHaveBeenCalledWith(
            '/api/v1/leaderboard?period=year',
            expect.objectContaining({ method: 'GET' }),
        );
        expect(screen.getByRole('button', { name: 'Este ano' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('invites to be the first when nothing was collected in the period', async () => {
        stubApi({ '/api/v1/leaderboard?period=month': () => json(board('month', [])) });
        renderAt('/', <LeaderboardPage />);

        expect(
            await screen.findByRole('heading', {
                name: 'Ainda não há retiradas em outubro de 2026',
            }),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Quero ser um ponto' })).toHaveAttribute(
            'href',
            '/escolas-e-empresas',
        );
    });

    it('shows an error with a way to try again', async () => {
        stubApi({
            '/api/v1/leaderboard?period=month': () =>
                json({ error: { code: 'X', message: 'x' } }, 500),
        });
        renderAt('/', <LeaderboardPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Não foi possível carregar o placar agora.',
        );
        expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    });
});

const impact = (overrides: object = {}) => ({
    point: { id: 'p1', name: 'Escola Sol', neighborhood: 'Centro', category: 'EDUCATION' },
    totalKg: 175.5,
    pickups: 3,
    firstPickupOn: '2025-03-10',
    lastPickupOn: '2026-10-20',
    capCount: 70_200,
    castrations: 1,
    doses: 2,
    remainingKg: 174.5,
    ...overrides,
});

describe('CertificatePage', () => {
    const route = '/certificado/:id';

    it('shows the name, the weight collected and since when', async () => {
        stubApi({
            '/api/v1/leaderboard/points/p1': () => json(impact()),
            '/api/v1/site-settings': () => json({ instagramHandle: 'patinhas' }),
        });
        renderAt('/certificado/p1', <CertificatePage />, route);

        expect(await screen.findByText('Escola Sol')).toBeInTheDocument();
        expect(screen.getByText('175,5 kg')).toBeInTheDocument();
        expect(screen.getByText('de tampinhas, desde 10 mar 2025')).toBeInTheDocument();
        expect(screen.getByText('castração paga')).toBeInTheDocument();
        expect(screen.getByText('@patinhas')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Imprimir o certificado/ })).toBeInTheDocument();
    });

    it('does not issue a certificate for a point without pickups', async () => {
        stubApi({
            '/api/v1/leaderboard/points/p1': () =>
                json(impact({ totalKg: 0, pickups: 0, firstPickupOn: null, lastPickupOn: null })),
            '/api/v1/site-settings': () => json({}),
        });
        renderAt('/certificado/p1', <CertificatePage />, route);

        expect(await screen.findByText(/ainda não teve retiradas/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Imprimir/ })).not.toBeInTheDocument();
    });

    it('says the point was not found', async () => {
        stubApi({
            '/api/v1/leaderboard/points/zzz': () =>
                json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
            '/api/v1/site-settings': () => json({}),
        });
        renderAt('/certificado/zzz', <CertificatePage />, route);

        expect(
            await screen.findByRole('heading', { name: 'Não achamos esse ponto' }),
        ).toBeInTheDocument();
    });
});
