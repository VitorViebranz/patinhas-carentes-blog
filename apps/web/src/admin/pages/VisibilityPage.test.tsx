import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { VisibilityPage } from './VisibilityPage';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

const settings = (hiddenFeatures: string[]) => ({
    gramsPerCap: 2.5,
    kgPriceBrl: 2,
    spayCostBrl: 350,
    goalKg: 175,
    monthlyAverageKg: 0,
    animalsServedYear: null,
    cnpj: null,
    pixKey: null,
    whatsappNumber: null,
    instagramHandle: null,
    adoptionUrl: null,
    hiddenFeatures,
    updatedAt: '2026-10-31T12:00:00.000Z',
});

const session = { user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'ADMIN' } };

function stub(hidden: string[], put: () => Response = () => json({})) {
    let current = hidden;
    const mock = vi.fn((url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        if (url === '/api/v1/auth/me') return Promise.resolve(json(editorOrAdmin));
        if (url === '/api/v1/admin/site-settings') return Promise.resolve(json(settings(current)));
        if (method === 'PUT' && url.startsWith('/api/v1/admin/features/')) {
            const failure = put();
            if (!failure.ok) return Promise.resolve(failure);
            const key = url.split('/').pop() ?? '';
            const { visible } = JSON.parse(String(init?.body)) as { visible: boolean };
            current = visible ? current.filter((k) => k !== key) : [...current, key];
            return Promise.resolve(json({ key, visible, hiddenFeatures: current }));
        }
        return Promise.resolve(json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404));
    });
    vi.stubGlobal('fetch', mock);
    return mock;
}

let editorOrAdmin: unknown = session;

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <ToastProvider>
                    <VisibilityPage />
                </ToastProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
    editorOrAdmin = session;
});

describe('VisibilityPage', () => {
    it('shows each item with its state and how many are off', async () => {
        stub(['page.leaderboard', 'home.points']);
        setup();

        const placar = await screen.findByRole('switch', { name: 'Placar' });
        expect(placar).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('switch', { name: 'Pontos de coleta' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
        expect(screen.getByRole('switch', { name: 'Como ajudar' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(screen.getByText('2 itens desligados.')).toBeInTheDocument();
    });

    it('groups pages, home sections and global items', async () => {
        stub([]);
        setup();

        await screen.findByRole('switch', { name: 'Placar' });
        expect(screen.getByRole('heading', { name: 'Páginas do site' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Página inicial' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Em todas as páginas' })).toBeInTheDocument();
        expect(screen.getByText('Tudo está ligado.')).toBeInTheDocument();
    });

    it('turns an item off in one click and offers to undo it', async () => {
        const mock = stub([]);
        setup();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('switch', { name: 'Placar' }));

        await waitFor(() =>
            expect(screen.getByRole('switch', { name: 'Placar' })).toHaveAttribute(
                'aria-checked',
                'false',
            ),
        );
        expect(mock).toHaveBeenCalledWith(
            '/api/v1/admin/features/page.leaderboard',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ visible: false }) }),
        );
        expect(await screen.findByText(/Placar: desligado/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Desfazer' }));

        await waitFor(() =>
            expect(screen.getByRole('switch', { name: 'Placar' })).toHaveAttribute(
                'aria-checked',
                'true',
            ),
        );
    });

    it('turns an item back on and says so', async () => {
        stub(['home.about']);
        setup();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('switch', { name: 'Quem somos' }));

        expect(await screen.findByText('Quem somos: ligado de novo.')).toBeInTheDocument();
    });

    it('links to a page only while it is on', async () => {
        stub(['page.help']);
        setup();

        await screen.findByRole('switch', { name: 'Placar' });
        const placarRow = screen
            .getByRole('switch', { name: 'Placar' })
            .closest('li') as HTMLElement;
        const helpRow = screen
            .getByRole('switch', { name: 'Como ajudar' })
            .closest('li') as HTMLElement;
        expect(within(placarRow).getByRole('link', { name: 'Abrir no site' })).toHaveAttribute(
            'href',
            '/placar',
        );
        expect(
            within(helpRow).queryByRole('link', { name: 'Abrir no site' }),
        ).not.toBeInTheDocument();
    });

    it('tells the person when saving fails and keeps the switch where it was', async () => {
        stub([], () => json({ error: { code: 'X', message: 'x' } }, 500));
        setup();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('switch', { name: 'Placar' }));

        expect(
            await screen.findByText('Não foi possível salvar. Tente de novo.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Placar' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
    });

    it('sends an editor away, since only administrators decide what is public', async () => {
        editorOrAdmin = { user: { ...session.user, role: 'EDITOR' } };
        stub([]);
        setup();

        await waitFor(() =>
            expect(screen.queryByRole('switch', { name: 'Placar' })).not.toBeInTheDocument(),
        );
    });
});
