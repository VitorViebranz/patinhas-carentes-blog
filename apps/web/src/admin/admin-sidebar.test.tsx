import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminRoutes from './AdminRoutes';
import { SIDEBAR_STORAGE_KEY } from './use-sidebar';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

const admin = { user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'ADMIN' } };
const dashboard = {
    activePoints: 1,
    newHelpRequests: 3,
    pointsWithoutPhone: 0,
    approximateLocationPoints: 0,
    pendingReport: { month: '2026-09', status: 'MISSING' },
};
const empty = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };

function stub() {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
            const routes: Record<string, () => Response> = {
                '/api/v1/auth/me': () => json(admin),
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

function renderAdmin() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/admin/solicitacoes']}>
                <Routes>
                    <Route path="admin/*" element={<AdminRoutes />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    window.localStorage.clear();
    stub();
});

afterEach(() => vi.unstubAllGlobals());

describe('admin sidebar', () => {
    it('starts expanded, with the menu names showing', async () => {
        renderAdmin();

        const toggle = await screen.findByRole('button', { name: 'Recolher o menu' });

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Painel do site')).toBeInTheDocument();
    });

    it('collapses with one click and remembers the choice', async () => {
        renderAdmin();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Recolher o menu' }));

        expect(screen.getByRole('button', { name: 'Expandir o menu' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('collapsed');
    });

    it('opens already collapsed on the next visit', async () => {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'collapsed');
        renderAdmin();

        expect(await screen.findByRole('button', { name: 'Expandir o menu' })).toBeInTheDocument();
    });

    it('expands again and forgets the saved choice', async () => {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'collapsed');
        renderAdmin();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Expandir o menu' }));

        expect(screen.getByRole('button', { name: 'Recolher o menu' })).toBeInTheDocument();
        expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBeNull();
    });

    it('keeps every menu item reachable by name and with a tooltip when collapsed', async () => {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'collapsed');
        renderAdmin();

        const nav = await screen.findByRole('navigation', { name: 'Painel' });

        const link = within(nav).getByRole('link', { name: /Retiradas e placar/ });
        expect(link).toHaveAttribute('title', 'Retiradas e placar');
        expect(within(nav).getAllByRole('link').length).toBeGreaterThanOrEqual(6);
    });
});
