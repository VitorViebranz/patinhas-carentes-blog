import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FosterRequestForm } from './FosterRequestForm';
import { SpaceRequestForm } from './SpaceRequestForm';

function wrap(node: React.ReactNode) {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

afterEach(() => vi.unstubAllGlobals());

describe('SpaceRequestForm', () => {
    it('shows errors in Portuguese and does not send an invalid form', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        wrap(<SpaceRequestForm />);

        await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));

        expect(screen.getByText('Escreva o seu nome.')).toBeInTheDocument();
        expect(screen.getByText(/WhatsApp com DDD/)).toBeInTheDocument();
        expect(screen.getByText('Marque a caixa para enviar.')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends the request with consent and shows the confirmation', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ id: '1' }), { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);
        const user = userEvent.setup();
        wrap(<SpaceRequestForm />);

        await user.type(screen.getByLabelText('Seu nome'), 'Ana Souza');
        await user.type(screen.getByLabelText('Seu WhatsApp ou e-mail'), '(47) 99145-7757');
        await user.type(screen.getByLabelText('Nome do espaço'), 'Escola Aurora');
        await user.type(screen.getByLabelText('Rua'), 'Rua das Flores');
        await user.type(screen.getByLabelText('Número'), '120');
        await user.type(screen.getByLabelText('Bairro'), 'Bom Retiro');
        await user.click(screen.getByLabelText('Empresa'));
        await user.click(screen.getByRole('checkbox', { name: /Concordo/ }));
        await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Pedido enviado'));
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/v1/help-requests');
        expect(JSON.parse(init.body as string)).toEqual({
            type: 'COLLECTION_POINT',
            requesterName: 'Ana Souza',
            contact: '(47) 99145-7757',
            institutionName: 'Escola Aurora',
            institutionType: 'COMPANY',
            wantsTalk: false,
            address: 'Rua das Flores, 120',
            neighborhoodName: 'Bom Retiro',
            consent: true,
        });
    });

    it('fills the street and neighborhood from the postal code', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        postalCode: '89223-005',
                        street: 'Rua Dona Francisca',
                        neighborhood: 'Bom Retiro',
                        city: 'Joinville',
                        state: 'SC',
                    }),
                    { status: 200 },
                ),
            ),
        );
        const user = userEvent.setup();
        wrap(<SpaceRequestForm />);

        await user.type(screen.getByLabelText(/CEP/), '89223005');

        await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua Dona Francisca'));
        expect(screen.getByLabelText('Bairro')).toHaveValue('Bom Retiro');
    });

    it('shows a friendly message when the limit is reached', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'x' } }), {
                    status: 429,
                }),
            ),
        );
        const user = userEvent.setup();
        wrap(<SpaceRequestForm />);
        await user.type(screen.getByLabelText('Seu nome'), 'Ana Souza');
        await user.type(screen.getByLabelText('Seu WhatsApp ou e-mail'), 'ana@example.com');
        await user.type(screen.getByLabelText('Nome do espaço'), 'Loja');
        await user.type(screen.getByLabelText('Rua'), 'Rua das Flores');
        await user.click(screen.getByRole('checkbox', { name: /Concordo/ }));
        await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Muitos pedidos');
    });
});

describe('FosterRequestForm', () => {
    it('sends the number of animals', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);
        const user = userEvent.setup();
        wrap(<FosterRequestForm />);

        await user.type(screen.getByLabelText('Seu nome'), 'Beto');
        await user.type(screen.getByLabelText('Seu WhatsApp ou e-mail'), 'beto@example.com');
        await user.selectOptions(
            screen.getByLabelText('Quantos animais você consegue receber?'),
            '2',
        );
        await user.click(screen.getByRole('checkbox', { name: /Concordo/ }));
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
        expect(JSON.parse(init.body as string)).toMatchObject({
            type: 'FOSTER',
            animalCapacity: 2,
            consent: true,
        });
    });
});
