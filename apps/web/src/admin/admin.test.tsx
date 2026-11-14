import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminRoutes from './AdminRoutes';

vi.mock('./components/LocationPicker', () => ({ default: () => <div data-testid="picker" /> }));

type Handler = (init?: RequestInit) => Response;

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}
const unauthorized = () => json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401);

function stub(routes: Record<string, Handler>) {
    const mock = vi.fn((url: string, init?: RequestInit) => {
        const key = `${init?.method ?? 'GET'} ${url}`;
        const handler = routes[key] ?? routes[url];
        return Promise.resolve(
            handler ? handler(init) : json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
        );
    });
    vi.stubGlobal('fetch', mock);
    return mock;
}

function renderAdmin(path: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[`/admin${path}`]}>
                <Routes>
                    <Route path="admin/*" element={<AdminRoutes />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

const editor = { user: { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'EDITOR' } };
const admin = { user: { ...editor.user, role: 'ADMIN' } };
const dashboard = {
    activePoints: 166,
    newHelpRequests: 2,
    pointsWithoutPhone: 3,
    approximateLocationPoints: 1,
    pendingReport: { month: '2026-09', status: 'MISSING' },
};
const empty = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };

afterEach(() => vi.unstubAllGlobals());

describe('admin access', () => {
    it('redirects to the login page without a session', async () => {
        stub({ '/api/v1/auth/me': unauthorized });
        renderAdmin('/pontos');
        expect(await screen.findByRole('heading', { name: 'Área da equipe' })).toBeInTheDocument();
    });

    it('shows a generic message for a wrong password', async () => {
        stub({ '/api/v1/auth/me': unauthorized, 'POST /api/v1/auth/login': unauthorized });
        const user = userEvent.setup();
        renderAdmin('/login');
        await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com');
        await user.type(screen.getByLabelText('Senha'), 'errada');
        await user.click(screen.getByRole('button', { name: 'Entrar no painel' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    });

    it('signs in and shows the dashboard', async () => {
        let signedIn = false;
        stub({
            '/api/v1/auth/me': () => (signedIn ? json(editor) : unauthorized()),
            'POST /api/v1/auth/login': () => {
                signedIn = true;
                return json(editor);
            },
            '/api/v1/admin/dashboard': () => json(dashboard),
            '/api/v1/admin/help-requests?status=NEW&page=1&pageSize=20': () => json(empty),
            '/api/v1/monthly-reports': () => json({ items: [] }),
            '/api/v1/site-settings': () => json({ goalKg: 175 }),
        });
        const user = userEvent.setup();
        renderAdmin('/login');
        await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com');
        await user.type(screen.getByLabelText('Senha'), 'senha-certa-123');
        await user.click(screen.getByRole('button', { name: 'Entrar no painel' }));

        expect(await screen.findByText('166')).toBeInTheDocument();
        expect(screen.getByText('2 pedidos para responder')).toBeInTheDocument();
    });

    it('hides the team page from editors', async () => {
        stub({
            '/api/v1/auth/me': () => json(editor),
            '/api/v1/admin/dashboard': () => json(dashboard),
            '/api/v1/admin/help-requests?status=NEW&page=1&pageSize=20': () => json(empty),
            '/api/v1/monthly-reports': () => json({ items: [] }),
            '/api/v1/site-settings': () => json({}),
        });
        renderAdmin('/equipe');
        await screen.findByText('Pendências');
        expect(screen.queryByRole('link', { name: /Equipe e ajustes/ })).not.toBeInTheDocument();
    });
});

describe('requests page', () => {
    it('marks a request as answered', async () => {
        const item = {
            id: 'r1',
            type: 'COLLECTION_POINT',
            requesterName: 'Maria',
            contact: '47999990000',
            institutionName: 'Escola Aurora',
            institutionType: 'SCHOOL',
            wantsTalk: true,
            animalCapacity: null,
            message: null,
            status: 'NEW',
            consentGivenAt: '2026-09-01T12:00:00.000Z',
            answeredAt: null,
            createdAt: '2026-09-01T12:00:00.000Z',
        };
        const patch = vi.fn(() => json({ ...item, status: 'ANSWERED' }));
        stub({
            '/api/v1/auth/me': () => json(editor),
            '/api/v1/admin/dashboard': () => json(dashboard),
            '/api/v1/admin/help-requests?page=1&pageSize=20': () =>
                json({ items: [item], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
            'PATCH /api/v1/admin/help-requests/r1': patch,
        });
        const user = userEvent.setup();
        renderAdmin('/solicitacoes');

        expect(await screen.findByText('Escola: Escola Aurora, quer palestra')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Marcar como respondido' }));
        await waitFor(() => expect(patch).toHaveBeenCalled());
    });
});

describe('points form', () => {
    it('asks for the name and the neighborhood before saving', async () => {
        const fetchMock = stub({
            '/api/v1/auth/me': () => json(editor),
            '/api/v1/admin/dashboard': () => json(dashboard),
            '/api/v1/neighborhoods': () => json({ items: [] }),
        });
        const user = userEvent.setup();
        renderAdmin('/pontos?novo=1');

        await user.click(await screen.findByRole('button', { name: 'Salvar ponto' }));
        expect(screen.getByText('Escreva o nome do local.')).toBeInTheDocument();
        expect(screen.getByText('Escolha o bairro.')).toBeInTheDocument();
        expect(
            fetchMock.mock.calls.some(
                ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
            ),
        ).toBe(false);
    });
});

describe('points form location', () => {
    const hoods = [
        {
            id: 'n1',
            name: 'Bom Retiro',
            slug: 'bom-retiro',
            latitude: -26.28,
            longitude: -48.84,
            outsideMainArea: false,
            pointCount: 1,
        },
    ];
    const created = {
        id: 'p1',
        name: 'Casa',
        neighborhoodId: 'n1',
        neighborhood: 'Bom Retiro',
        address: 'Rua X, 60',
        phone: null,
        category: 'COMMERCE_SERVICES',
        openingHours: null,
        latitude: -26.28,
        longitude: -48.84,
        locationPrecision: 'NEIGHBORHOOD',
        outsideMainArea: false,
        status: 'ACTIVE',
        createdAt: 'x',
        updatedAt: 'x',
    };

    function base(extra: Record<string, Handler> = {}) {
        return stub({
            '/api/v1/auth/me': () => json(editor),
            '/api/v1/admin/dashboard': () => json(dashboard),
            '/api/v1/neighborhoods': () => json({ items: hoods }),
            '/api/v1/admin/collection-points?page=1&pageSize=20&status=ACTIVE': () => json(empty),
            ...extra,
        });
    }

    it('fills the street and the neighborhood from the postal code', async () => {
        const lookup = vi.fn(() =>
            json({
                postalCode: '89223-005',
                street: 'Rua Afonso Frederico Leopoldo',
                neighborhood: 'Bom Retiro',
                city: 'Joinville',
                state: 'SC',
            }),
        );
        base({ '/api/v1/postal-codes/89223005': lookup });
        const user = userEvent.setup();
        renderAdmin('/pontos?novo=1');

        await user.type(await screen.findByLabelText('CEP'), '89223005');

        expect(
            await screen.findByDisplayValue('Rua Afonso Frederico Leopoldo'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Bairro')).toHaveValue('Bom Retiro');
        expect(screen.getByLabelText('CEP')).toHaveValue('89223-005');
        expect(screen.getByText(/CEP encontrado: Rua Afonso/)).toBeInTheDocument();
    });

    it('shows the found position and sends it as exact coordinates', async () => {
        const preview = vi.fn(() =>
            json({
                found: true,
                latitude: -26.2801,
                longitude: -48.8402,
                locationPrecision: 'HOUSE_NUMBER',
            }),
        );
        const post = vi.fn(() =>
            json({ ...created, locationPrecision: 'HOUSE_NUMBER', locationSource: 'manual' }, 201),
        );
        base({
            'POST /api/v1/admin/geocode-preview': preview,
            'POST /api/v1/admin/collection-points': post,
        });
        const user = userEvent.setup();
        renderAdmin('/pontos?novo=1');

        await user.type(await screen.findByLabelText('Nome do local'), 'Casa');
        await user.type(screen.getByLabelText('Rua'), 'Rua X');
        await user.type(screen.getByLabelText('Número'), '60');
        await user.click(screen.getByLabelText('Bairro'));
        await user.click(
            within(await screen.findByRole('listbox')).getByRole('option', { name: 'Bom Retiro' }),
        );
        await user.click(screen.getByRole('button', { name: 'Localizar no mapa' }));

        expect(await screen.findByText(/Endereço encontrado/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Salvar ponto' }));

        await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
        const body = JSON.parse((post.mock.calls[0] as unknown as [RequestInit])[0].body as string);
        expect(body).toMatchObject({
            address: 'Rua X, 60',
            latitude: -26.2801,
            longitude: -48.8402,
            locationPrecision: 'HOUSE_NUMBER',
        });
    });

    it('warns when the address is not found and keeps the neighborhood pin out of the request', async () => {
        const preview = vi.fn(() =>
            json({
                found: false,
                latitude: -26.28,
                longitude: -48.84,
                locationPrecision: 'NEIGHBORHOOD',
            }),
        );
        const post = vi.fn(() =>
            json({ ...created, locationSource: 'neighborhood-fallback' }, 201),
        );
        const patch = vi.fn(() =>
            json({ ...created, locationPrecision: 'HOUSE_NUMBER', locationSource: 'manual' }),
        );
        base({
            'POST /api/v1/admin/geocode-preview': preview,
            'POST /api/v1/admin/collection-points': post,
            'PATCH /api/v1/admin/collection-points/p1': patch,
        });
        const user = userEvent.setup();
        renderAdmin('/pontos?novo=1');

        await user.type(await screen.findByLabelText('Nome do local'), 'Casa');
        await user.type(screen.getByLabelText('Rua'), 'Rua X');
        await user.click(screen.getByLabelText('Bairro'));
        await user.click(
            within(await screen.findByRole('listbox')).getByRole('option', { name: 'Bom Retiro' }),
        );
        await user.click(screen.getByRole('button', { name: 'Localizar no mapa' }));
        expect(await screen.findByText(/Não achei esse endereço/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Salvar ponto' }));
        expect(await screen.findByText(/não achei esse endereço no mapa/)).toBeInTheDocument();
        const first = JSON.parse(
            (post.mock.calls[0] as unknown as [RequestInit])[0].body as string,
        );
        expect(first).not.toHaveProperty('latitude');

        await user.type(screen.getByLabelText(/Colar coordenadas/), '-26.2801, -48.8402');
        await user.click(screen.getByRole('button', { name: 'Salvar ponto' }));

        await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('rejects coordinates it cannot read', async () => {
        base();
        const user = userEvent.setup();
        renderAdmin('/pontos?novo=1');
        await user.type(await screen.findByLabelText(/Colar coordenadas/), 'abc');
        await user.click(screen.getByRole('button', { name: 'Salvar ponto' }));
        expect(screen.getByText(/Não entendi as coordenadas/)).toBeInTheDocument();
    });
});

describe('team page', () => {
    it('lets an administrator open it', async () => {
        stub({
            '/api/v1/auth/me': () => json(admin),
            '/api/v1/admin/dashboard': () => json(dashboard),
            '/api/v1/admin/site-settings': () =>
                json({
                    spayCostBrl: 350,
                    kgPriceBrl: 2,
                    goalKg: 175,
                    gramsPerCap: 2.5,
                    monthlyAverageKg: 1500,
                    animalsServedYear: null,
                    cnpj: '45559299000157',
                    pixKey: '45559299000157',
                    whatsappNumber: '5547991457757',
                    instagramHandle: 'patinhas',
                    adoptionUrl: null,
                    hiddenFeatures: [],
                    updatedAt: 'x',
                }),
            '/api/v1/admin/users?pageSize=100': () =>
                json({ items: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }),
        });
        renderAdmin('/equipe');
        expect(await screen.findByLabelText('Custo médio de uma castração (R$)')).toHaveValue(
            '350',
        );
        expect(screen.getByLabelText('Média mensal arrecadada (kg)')).toHaveValue('1500');
        expect(screen.getByText('Cadastrar pessoa da equipe')).toBeInTheDocument();
    });
});
