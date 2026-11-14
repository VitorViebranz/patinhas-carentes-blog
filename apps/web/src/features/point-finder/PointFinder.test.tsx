import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectionPoint, Neighborhood } from '../../services/api/types';
import { PointFinderContent } from './PointFinder';

vi.mock('./PointMap', () => ({
    default: ({ reference }: { reference: unknown }) => (
        <div data-testid="map" data-reference={reference ? 'yes' : 'no'} />
    ),
}));

const neighborhoods: Neighborhood[] = [
    {
        id: 'n1',
        name: 'Centro',
        slug: 'centro',
        latitude: -26.304,
        longitude: -48.846,
        outsideMainArea: false,
        pointCount: 2,
    },
    {
        id: 'n2',
        name: 'Vila Nova',
        slug: 'vila-nova',
        latitude: -26.27,
        longitude: -48.82,
        outsideMainArea: false,
        pointCount: 0,
    },
];

function point(id: string, name: string, lat: number, lng: number): CollectionPoint {
    return {
        id,
        name,
        neighborhoodId: 'n1',
        neighborhood: 'Centro',
        address: 'Rua A, 1',
        phone: null,
        category: 'COMMERCE_SERVICES',
        openingHours: null,
        latitude: lat,
        longitude: lng,
        locationPrecision: 'STREET',
        outsideMainArea: false,
    };
}

const points = [
    point('p1', 'Mercado Perto', -26.305, -48.846),
    point('p2', 'Escola Longe', -26.26, -48.8),
];

function mockGeolocation(answer: 'grant' | 'deny') {
    const getCurrentPosition = vi.fn(
        (success: (position: unknown) => void, failure: (error: unknown) => void) => {
            if (answer === 'grant') {
                success({ coords: { latitude: -26.3051, longitude: -48.8461, accuracy: 84 } });
            } else {
                failure(new Error('denied'));
            }
        },
    );
    Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition },
        configurable: true,
    });
    return getCurrentPosition;
}

function setup() {
    const view = render(
        <MemoryRouter>
            <PointFinderContent points={points} neighborhoods={neighborhoods} />
        </MemoryRouter>,
    );
    return { user: userEvent.setup(), container: view.container };
}

afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
});

describe('PointFinder', () => {
    it('shows the nearest point first after choosing a neighborhood', async () => {
        const { user } = setup();
        await user.selectOptions(screen.getByRole('combobox'), 'Centro');

        const items = screen.getAllByText(/Mercado Perto|Escola Longe/);
        expect(items[0]).toHaveTextContent('Mercado Perto');
        expect(screen.getByText(/do bairro Centro/)).toBeInTheDocument();
    });

    it('filters by the search text only after 2 letters', async () => {
        const { user } = setup();
        const input = screen.getByRole('searchbox');

        await user.type(input, 'e');
        expect(screen.getByText('Escola Longe')).toBeInTheDocument();
        expect(screen.getByText('Mercado Perto')).toBeInTheDocument();

        await user.type(input, 's');
        expect(screen.queryByText('Mercado Perto')).not.toBeInTheDocument();
    });

    it('explains when geolocation is unsupported', async () => {
        const { user } = setup();
        await user.click(screen.getByRole('button', { name: /minha localização/i }));
        expect(screen.getByText(/não permite|não suporta|neste aparelho/i)).toBeInTheDocument();
    });
});

describe('PointFinder location on entry', () => {
    it('asks for the location once when it opens and starts from where the person is', async () => {
        const getCurrentPosition = mockGeolocation('grant');
        setup();

        expect(getCurrentPosition).toHaveBeenCalledTimes(1);
        expect(await screen.findByText(/a partir da sua localização/)).toBeInTheDocument();
        expect(screen.getByText(/precisão de cerca de 80 m/)).toBeInTheDocument();
        expect(screen.getByTestId('map')).toHaveAttribute('data-reference', 'yes');
        expect(screen.getByText('Mais perto')).toBeInTheDocument();
        const items = screen.getAllByText(/Mercado Perto|Escola Longe/);
        expect(items[0]).toHaveTextContent('Mercado Perto');
    });

    it('leaves the map without a starting point and lists A to Z when it is refused', async () => {
        mockGeolocation('deny');
        setup();

        expect(
            await screen.findByText(/Use a sua localização ou escolha o bairro/),
        ).toBeInTheDocument();
        expect(screen.getByTestId('map')).toHaveAttribute('data-reference', 'no');
        expect(screen.queryByText('Mais perto')).not.toBeInTheDocument();
        expect(screen.queryByText(/Ponto de partida/)).not.toBeInTheDocument();
        const items = screen.getAllByText(/Mercado Perto|Escola Longe/);
        expect(items[0]).toHaveTextContent('Escola Longe');
    });

    it('explains how to allow the access only when the person taps the button', async () => {
        const getCurrentPosition = mockGeolocation('deny');
        const { user } = setup();
        expect(screen.queryByText(/Libere o acesso/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /minha localização/i }));

        expect(getCurrentPosition).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/Libere o acesso/)).toBeInTheDocument();
    });

    it('keeps the neighborhood the person chose instead of the late location answer', async () => {
        const pending: ((position: unknown) => void)[] = [];
        Object.defineProperty(navigator, 'geolocation', {
            value: {
                getCurrentPosition: (success: (position: unknown) => void) => pending.push(success),
            },
            configurable: true,
        });
        const { user } = setup();

        await user.selectOptions(screen.getByRole('combobox'), 'Vila Nova');
        await act(async () => {
            pending[0]?.({ coords: { latitude: -26.3051, longitude: -48.8461 } });
        });

        expect(screen.getByText(/do bairro Vila Nova/)).toBeInTheDocument();
        expect(screen.queryByText(/da sua localização/)).not.toBeInTheDocument();
    });
});

describe('PointFinder list panel', () => {
    it('collapses the list to the side and brings it back', async () => {
        const { user, container } = setup();
        const grid = container.querySelector('[data-list]');
        expect(grid).toHaveAttribute('data-list', 'open');

        await user.click(screen.getByRole('button', { name: /Recolher lista/ }));
        expect(grid).toHaveAttribute('data-list', 'closed');

        await user.click(screen.getByRole('button', { name: /Mostrar lista/ }));
        expect(grid).toHaveAttribute('data-list', 'open');
    });
});
