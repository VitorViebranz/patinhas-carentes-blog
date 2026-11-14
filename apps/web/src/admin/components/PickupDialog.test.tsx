import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AdminPoint } from '../../services/api/admin-types';
import { PickupDialog } from './PickupDialog';
import { ToastProvider } from './Toast';

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
});

afterEach(() => vi.unstubAllGlobals());

const point = { id: 'p1', name: 'Escola Sol' } as AdminPoint;
const created = {
    id: 'k1',
    pointId: 'p1',
    pointName: 'Escola Sol',
    pickedUpOn: '2026-10-30',
    kg: 12.5,
    createdAt: '2026-10-30T12:00:00.000Z',
};
const history = {
    items: [{ ...created, id: 'k0', kg: 40, pickedUpOn: '2026-09-02' }],
    meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

function stub(extra: Record<string, () => Response> = {}) {
    const routes: Record<string, () => Response> = {
        'GET /api/v1/admin/pickups?pointId=p1&pageSize=5': () => json(history),
        'POST /api/v1/admin/pickups': () => json(created, 201),
        ...extra,
    };
    const mock = vi.fn((url: string, init?: RequestInit) => {
        const handler = routes[`${init?.method ?? 'GET'} ${url}`];
        return Promise.resolve(
            handler ? handler() : json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404),
        );
    });
    vi.stubGlobal('fetch', mock);
    return mock;
}

function setup() {
    const onRegistered = vi.fn();
    const onClose = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ToastProvider>
                <PickupDialog point={point} onRegistered={onRegistered} onClose={onClose} />
            </ToastProvider>
        </QueryClientProvider>,
    );
    return { onRegistered, onClose };
}

function postedBody(mock: ReturnType<typeof stub>): unknown {
    const call = mock.mock.calls.find(([, init]) => init?.method === 'POST');
    return call?.[1]?.body ? JSON.parse(String(call[1].body)) : null;
}

describe('PickupDialog', () => {
    it('is named by its title and shows the point and the recent pickups', async () => {
        stub();
        setup();

        expect(screen.getByRole('dialog', { name: 'Registrar retirada' })).toBeInTheDocument();
        expect(screen.getByText('Escola Sol')).toBeInTheDocument();
        expect(await screen.findByText('40 kg')).toBeInTheDocument();
        expect(screen.getByText('2 set 2026')).toBeInTheDocument();
    });

    it('does not send a weight that is empty, zero or not a number', async () => {
        const mock = stub();
        const { onClose } = setup();
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /Registrar retirada/ }));
        expect(await screen.findByText('Informe o peso em kg, como 12,5.')).toBeInTheDocument();

        await user.type(screen.getByLabelText('Peso recolhido (kg)'), 'doze');
        await user.click(screen.getByRole('button', { name: /Registrar retirada/ }));

        expect(postedBody(mock)).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('sends the weight with a comma as a number, then reports and closes', async () => {
        const mock = stub();
        const { onRegistered, onClose } = setup();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText('Peso recolhido (kg)'), '12,5');
        await user.click(screen.getByRole('button', { name: /Registrar retirada/ }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(postedBody(mock)).toMatchObject({ pointId: 'p1', kg: 12.5 });
        expect(onRegistered).toHaveBeenCalledWith(created);
    });

    it('keeps the dialog open and shows the server message when saving fails', async () => {
        stub({
            'POST /api/v1/admin/pickups': () =>
                json({ error: { code: 'NOT_FOUND', message: 'Collection point not found' } }, 404),
        });
        const { onClose } = setup();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText('Peso recolhido (kg)'), '5');
        await user.click(screen.getByRole('button', { name: /Registrar retirada/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Collection point not found');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('asks before deleting a past pickup', async () => {
        const mock = stub({
            'DELETE /api/v1/admin/pickups/k0': () => new Response(null, { status: 204 }),
        });
        setup();
        const user = userEvent.setup();

        await user.click(
            await screen.findByRole('button', { name: 'Apagar a retirada de 2 set 2026' }),
        );
        expect(screen.getByRole('dialog', { name: 'Apagar esta retirada?' })).toBeInTheDocument();
        expect(mock).not.toHaveBeenCalledWith(
            '/api/v1/admin/pickups/k0',
            expect.objectContaining({ method: 'DELETE' }),
        );

        await user.click(screen.getByRole('button', { name: 'Apagar retirada' }));

        await waitFor(() =>
            expect(mock).toHaveBeenCalledWith(
                '/api/v1/admin/pickups/k0',
                expect.objectContaining({ method: 'DELETE' }),
            ),
        );
    });
});
