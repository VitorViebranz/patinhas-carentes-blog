import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../features/theme/theme';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import AdminRoutes from './AdminRoutes';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

const admin = { user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'ADMIN' } };
const dashboard = {
    activePoints: 1,
    newHelpRequests: 0,
    pointsWithoutPhone: 0,
    approximateLocationPoints: 0,
    pendingReport: { month: '2026-09', status: 'MISSING' },
};
const empty = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };

function stub(signedIn: boolean) {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
            const routes: Record<string, () => Response> = {
                '/api/v1/auth/me': () =>
                    signedIn
                        ? json(admin)
                        : json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401),
                '/api/v1/admin/dashboard': () => json(dashboard),
                '/api/v1/admin/help-requests?page=1&pageSize=20': () => json(empty),
            };
            const handler = routes[url];
            return Promise.resolve(
                handler ? handler() : json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
            );
        }),
    );
}

function renderAdmin(path: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider>
                <MemoryRouter initialEntries={[`/admin${path}`]}>
                    <Routes>
                        <Route path="admin/*" element={<AdminRoutes />} />
                    </Routes>
                </MemoryRouter>
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset['theme'];
    vi.stubGlobal('matchMedia', () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    }));
});

afterEach(() => vi.unstubAllGlobals());

describe('admin theme', () => {
    it('lets the team switch to the dark theme from the top bar and remembers it', async () => {
        stub(true);
        renderAdmin('/solicitacoes');
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Mudar para o tema escuro' }));

        expect(document.documentElement.dataset['theme']).toBe('dark');
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        expect(screen.getByRole('button', { name: 'Mudar para o tema claro' })).toBeInTheDocument();
    });

    it('does not force the light theme on the panel any more', async () => {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        stub(true);
        const { container } = renderAdmin('/solicitacoes');

        await screen.findByRole('button', { name: 'Mudar para o tema claro' });

        expect(container.querySelector('.theme-light')).toBeNull();
        expect(document.documentElement.dataset['theme']).toBe('dark');
    });

    it('offers the switch on the login page too', async () => {
        stub(false);
        renderAdmin('/login');

        expect(
            await screen.findByRole('button', { name: 'Mudar para o tema escuro' }),
        ).toBeInTheDocument();
    });
});
