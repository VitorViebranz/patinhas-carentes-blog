import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { PickupsPage } from './PickupsPage';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

const meta = (total: number) => ({ page: 1, pageSize: 100, total, totalPages: 1 });

const point = (id: string, name: string, neighborhood: string) => ({
    id,
    name,
    neighborhood,
    neighborhoodId: 'n',
    address: null,
    phone: null,
    category: 'EDUCATION',
    openingHours: null,
    latitude: 0,
    longitude: 0,
    locationPrecision: 'HOUSE_NUMBER',
    outsideMainArea: false,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

const settings = {
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
    hiddenFeatures: [] as string[],
    updatedAt: '2026-10-31T12:00:00.000Z',
};

const pickup = (id: string, pointName: string, kg: number) => ({
    id,
    pointId: 'p1',
    pointName,
    pickedUpOn: '2026-10-20',
    kg,
    createdAt: '2026-10-20T12:00:00.000Z',
});

type Handler = (init?: RequestInit) => Response;

function stub(extra: Record<string, Handler> = {}) {
    const routes: Record<string, Handler> = {
        'GET /api/v1/auth/me': () =>
            json({ user: { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'ADMIN' } }),
        'GET /api/v1/admin/site-settings': () => json(settings),
        'GET /api/v1/admin/collection-points?page=1&pageSize=100&status=ACTIVE': () =>
            json({
                items: [
                    point('p1', 'Escola Sol', 'Centro'),
                    point('p2', 'Loja Lua', 'América'),
                    point('p3', 'Colégio Alfa', 'Atiradores'),
                ],
                meta: meta(3),
            }),
        'GET /api/v1/admin/pickups?pageSize=10': () =>
            json({ items: [pickup('k1', 'Escola Sol', 40)], meta: meta(1) }),
        'GET /api/v1/admin/pickups/summary': () =>
            json({
                items: [
                    { pointId: 'p1', totalKg: 100, pickups: 2, lastPickupOn: '2026-10-20' },
                    { pointId: 'p2', totalKg: 250, pickups: 3, lastPickupOn: '2026-10-25' },
                ],
            }),
        ...extra,
    };
    const mock = vi.fn((url: string, init?: RequestInit) => {
        const handler = routes[`${init?.method ?? 'GET'} ${url}`];
        return Promise.resolve(
            handler ? handler(init) : json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
        );
    });
    vi.stubGlobal('fetch', mock);
    return mock;
}

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <ToastProvider>
                    <PickupsPage />
                </ToastProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
});

afterEach(() => vi.unstubAllGlobals());

describe('PickupsPage', () => {
    it('explains the three steps from registering to the certificate', async () => {
        stub();
        setup();

        expect(await screen.findByText('Registre a retirada')).toBeInTheDocument();
        expect(screen.getByText('O ponto entra no placar')).toBeInTheDocument();
        expect(screen.getByText('Gere o certificado')).toBeInTheDocument();
    });

    it('lists the points by total weight with a certificate button for each', async () => {
        stub();
        setup();

        const table = await screen.findByRole('table');
        const rows = within(table).getAllByRole('row').slice(1);
        expect(rows).toHaveLength(2);
        expect(within(rows[0] as HTMLElement).getByText('1º')).toBeInTheDocument();
        expect(within(rows[0] as HTMLElement).getByText('Loja Lua')).toBeInTheDocument();
        expect(within(rows[0] as HTMLElement).getByText('250 kg')).toBeInTheDocument();
        expect(
            within(rows[0] as HTMLElement).getByRole('link', { name: 'Abrir certificado' }),
        ).toHaveAttribute('href', '/certificado/p2');
        expect(within(rows[1] as HTMLElement).getByText('Escola Sol')).toBeInTheDocument();
    });

    it('says the placar is empty when nobody had a pickup yet', async () => {
        stub({ 'GET /api/v1/admin/pickups/summary': () => json({ items: [] }) });
        setup();

        expect(await screen.findByText('O placar ainda está vazio')).toBeInTheDocument();
    });

    it('has a single field to find the point: it narrows the list while typing', async () => {
        stub();
        setup();
        const user = userEvent.setup();

        const field = await screen.findByRole('combobox', { name: 'Ponto de coleta' });
        await user.type(field, 'americ');

        const options = within(screen.getByRole('listbox')).getAllByRole('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent('Loja Lua');
        expect(screen.queryByLabelText('Buscar o ponto')).not.toBeInTheDocument();
    });

    it('asks for the point before sending', async () => {
        const mock = stub();
        setup();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('Peso recolhido (kg)'), '12,5');
        await user.click(screen.getByRole('button', { name: /Registrar retirada/ }));

        expect(await screen.findByText('Escolha o ponto de coleta.')).toBeInTheDocument();
        expect(mock).not.toHaveBeenCalledWith(
            '/api/v1/admin/pickups',
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('registers a pickup for the chosen point and tells the person', async () => {
        const mock = stub({
            'POST /api/v1/admin/pickups': () => json(pickup('k2', 'Loja Lua', 12.5), 201),
        });
        setup();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('combobox', { name: 'Ponto de coleta' }));
        await user.click(screen.getByRole('option', { name: /Loja Lua/ }));
        await user.type(screen.getByLabelText('Peso recolhido (kg)'), '12,5');
        await user.click(screen.getByRole('button', { name: /Registrar retirada/ }));

        expect(
            await screen.findByText(/Retirada registrada: 12,5 kg em Loja Lua/),
        ).toBeInTheDocument();
        const call = mock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ pointId: 'p2', kg: 12.5 });
        expect(screen.getByLabelText('Peso recolhido (kg)')).toHaveValue('');
    });

    it('explains why an editor could not delete an older pickup', async () => {
        stub({
            'DELETE /api/v1/admin/pickups/k1': () =>
                json({ error: { code: 'FORBIDDEN', message: 'x' } }, 403),
        });
        setup();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Apagar retirada' }));
        const buttons = await screen.findAllByRole('button', { name: 'Apagar retirada' });
        await user.click(buttons[buttons.length - 1] as HTMLElement);

        await waitFor(() =>
            expect(
                screen.getByText(
                    'Só um administrador apaga uma retirada antiga ou de outra pessoa.',
                ),
            ).toBeInTheDocument(),
        );
    });
});
