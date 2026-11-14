import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DenouncePage } from './denounce/DenouncePage';
import { ReportPage } from './report/ReportPage';
import { SchoolPage } from './school/SchoolPage';
import { StoryPage } from './stories/StoryPage';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

function stubApi(routes: Record<string, () => Response>) {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
            const handler = routes[url];
            return Promise.resolve(
                handler ? handler() : json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
            );
        }),
    );
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

afterEach(() => vi.unstubAllGlobals());

describe('DenouncePage', () => {
    it('lists the phones and the city portal', () => {
        renderAt('/', <DenouncePage />);
        expect(screen.getByRole('link', { name: /181/ })).toHaveAttribute('href', 'tel:181');
        expect(screen.getByRole('link', { name: /190/ })).toHaveAttribute('href', 'tel:190');
        expect(screen.getByRole('link', { name: /portal da prefeitura/ })).toHaveAttribute(
            'href',
            'https://ouvidoria-form.joinville.sc.gov.br/',
        );
    });
});

describe('SchoolPage', () => {
    it('updates the poster and the message while typing the name', async () => {
        stubApi({});
        renderAt('/', <SchoolPage />);
        const input = screen.getByLabelText('Nome da escola, empresa ou loja');
        await userEvent.clear(input);
        await userEvent.type(input, 'Loja Sol');

        expect(screen.getAllByText('Loja Sol').length).toBeGreaterThan(0);
        expect((screen.getByLabelText(/Mensagem pronta/) as HTMLTextAreaElement).value).toContain(
            'O(a) Loja Sol',
        );
        expect(screen.getByRole('img', { name: /QR code/ }).querySelector('svg')).not.toBeNull();
    });
});

describe('ReportPage', () => {
    it('shows the latest month, the neutering it paid and what is left for the next', async () => {
        stubApi({
            '/api/v1/monthly-reports': () =>
                json({
                    items: [
                        {
                            month: '2026-09',
                            totalKg: 1480,
                            capCount: 592000,
                            castrations: 8,
                            remainingKg: 95,
                            outcomeSummary: null,
                            publishedAt: null,
                        },
                    ],
                }),
            '/api/v1/site-settings': () =>
                json({
                    goalKg: 175,
                    kgPriceBrl: 2,
                    spayCostBrl: 350,
                    monthlyAverageKg: 1500,
                }),
        });
        renderAt('/', <ReportPage />);

        expect(await screen.findByText('Setembro de 2026')).toBeInTheDocument();
        expect(screen.getByText('1.480 kg')).toBeInTheDocument();
        expect(screen.getByText('Pagou 8 castrações.')).toBeInTheDocument();
        expect(screen.getByText(/Faltam 95 kg para a próxima castração/)).toBeInTheDocument();
        expect(await screen.findByText('Quanto arrecadamos por mês')).toBeInTheDocument();
        expect(screen.getByText('1.500 kg')).toBeInTheDocument();
    });

    it('shows an empty message when nothing is published', async () => {
        stubApi({
            '/api/v1/monthly-reports': () => json({ items: [] }),
            '/api/v1/site-settings': () => json({}),
        });
        renderAt('/', <ReportPage />);
        expect(await screen.findByText(/será publicado em breve/)).toBeInTheDocument();
    });
});

describe('StoryPage', () => {
    it('renders the paragraphs of a story', async () => {
        stubApi({
            '/api/v1/stories/toby': () =>
                json({
                    id: '1',
                    title: 'Oi, eu sou o Toby',
                    slug: 'toby',
                    excerpt: '',
                    coverUrl: null,
                    coverAlt: null,
                    publishedAt: '2026-09-13T15:00:00.000Z',
                    body: 'Primeiro.\n\nSegundo.',
                }),
        });
        renderAt('/historias/toby', <StoryPage />, '/historias/:slug');

        expect(
            await screen.findByRole('heading', { name: 'Oi, eu sou o Toby' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Primeiro.')).toBeInTheDocument();
        expect(screen.getByText('Segundo.')).toBeInTheDocument();
    });

    it('shows the not found page for an unknown story', async () => {
        stubApi({});
        renderAt('/historias/nada', <StoryPage />, '/historias/:slug');
        expect(await screen.findByText('Não achamos essa página')).toBeInTheDocument();
    });
});
