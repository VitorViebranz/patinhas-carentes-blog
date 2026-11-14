import { FEATURES } from '@patinhas/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '../../app/layouts/PublicLayout';
import { HomePage } from '../../pages/home/HomePage';
import { Feature } from './Feature';
import { PageGate } from './PageGate';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
}

function stubSettings(hiddenFeatures: string[] | 'error') {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
            if (url === '/api/v1/site-settings') {
                return Promise.resolve(
                    hiddenFeatures === 'error'
                        ? json({ error: { code: 'X', message: 'x' } }, 500)
                        : json({
                              gramsPerCap: 2.5,
                              kgPriceBrl: 2,
                              spayCostBrl: 350,
                              goalKg: 175,
                              monthlyAverageKg: 1500,
                              animalsServedYear: 40,
                              collectionPointCount: 166,
                              neighborhoodCount: 40,
                              hiddenFeatures,
                          }),
                );
            }
            return Promise.resolve(json({ items: [] }));
        }),
    );
}

function renderWith(ui: React.ReactNode, path = '/') {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    }));
});

afterEach(() => vi.unstubAllGlobals());

describe('Feature', () => {
    it('shows its content when the key is not hidden', async () => {
        stubSettings([]);
        renderWith(<Feature name="home.about">conteúdo</Feature>);

        expect(await screen.findByText('conteúdo')).toBeInTheDocument();
    });

    it('hides its content when the key is hidden', async () => {
        stubSettings(['home.about']);
        renderWith(
            <>
                <Feature name="home.about">escondido</Feature>
                <Feature name="home.how">aparece</Feature>
            </>,
        );

        expect(await screen.findByText('aparece')).toBeInTheDocument();
        expect(screen.queryByText('escondido')).not.toBeInTheDocument();
    });

    it('needs every key of a list to be on', async () => {
        stubSettings(['page.school']);
        renderWith(
            <>
                <Feature name={['home.callout', 'page.school']}>faixa</Feature>
                <Feature name="home.how">carregou</Feature>
            </>,
        );

        expect(await screen.findByText('carregou')).toBeInTheDocument();
        expect(screen.queryByText('faixa')).not.toBeInTheDocument();
    });

    it('shows nothing while it does not know yet, instead of flashing hidden content', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => undefined)),
        );
        renderWith(<Feature name="home.about">conteúdo</Feature>);

        expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    });

    it('shows the content when the settings cannot be loaded, so the site never goes blank', async () => {
        stubSettings('error');
        renderWith(<Feature name="home.about">conteúdo</Feature>);

        expect(await screen.findByText('conteúdo')).toBeInTheDocument();
    });
});

describe('PageGate', () => {
    const gate = (
        <Routes>
            <Route
                path="/"
                element={
                    <PageGate feature="page.leaderboard">
                        <p>placar aberto</p>
                    </PageGate>
                }
            />
        </Routes>
    );

    it('opens the page when it is on', async () => {
        stubSettings([]);
        renderWith(gate);

        expect(await screen.findByText('placar aberto')).toBeInTheDocument();
    });

    it('says the page is not available when it is off', async () => {
        stubSettings(['page.leaderboard']);
        renderWith(gate);

        expect(
            await screen.findByRole('heading', { name: 'Esta página não está disponível' }),
        ).toBeInTheDocument();
        expect(screen.queryByText('placar aberto')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute(
            'href',
            '/',
        );
    });

    it('waits with a loading message instead of showing the page for a moment', () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => undefined)),
        );
        renderWith(gate);

        expect(screen.getByRole('status')).toHaveTextContent('Carregando');
        expect(screen.queryByText('placar aberto')).not.toBeInTheDocument();
    });
});

describe('the site menu', () => {
    const layout = (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route index element={<p>início</p>} />
            </Route>
        </Routes>
    );

    it('lists every page and the donate button when nothing is off', async () => {
        stubSettings([]);
        renderWith(layout);

        const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
        await within(nav).findAllByText('Placar');
        for (const label of ['Seja um ponto', 'Como ajudar', 'Para onde vai', 'Histórias']) {
            expect(within(nav).getAllByText(label).length).toBeGreaterThan(0);
        }
        expect(screen.getAllByRole('link', { name: /Doar tampinhas/ }).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: 'Falar no WhatsApp' })).toBeInTheDocument();
    });

    it('drops a page that is off from the menu and from the footer', async () => {
        stubSettings(['page.leaderboard', 'page.stories']);
        renderWith(layout);

        const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
        await within(nav).findByText('Como ajudar');
        expect(within(nav).queryByText('Placar')).not.toBeInTheDocument();
        expect(within(nav).queryByText('Histórias')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Placar dos pontos de coleta' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Histórias de resgate' }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Privacidade' })).toBeInTheDocument();
    });

    it('drops the donate buttons together with the collection points', async () => {
        stubSettings(['home.points']);
        renderWith(layout);

        const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
        await within(nav).findByText('Como ajudar');
        expect(screen.queryByRole('link', { name: /Doar tampinhas/ })).not.toBeInTheDocument();
    });

    it('drops the floating WhatsApp button when it is off', async () => {
        stubSettings(['global.whatsapp']);
        renderWith(layout);

        const nav = await screen.findByRole('navigation', { name: 'Menu principal' });
        await within(nav).findByText('Como ajudar');
        expect(screen.queryByRole('link', { name: 'Falar no WhatsApp' })).not.toBeInTheDocument();
    });
});

describe('the home page', () => {
    const homeKeys = FEATURES.filter((feature) => feature.kind === 'section').map(
        (feature) => feature.key,
    );

    it('keeps only the top of the page when every section is off', async () => {
        stubSettings(homeKeys);
        renderWith(<HomePage />);

        expect(
            await screen.findByRole('heading', {
                name: 'Cada tampinha dá a um bichinho uma segunda chance.',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Quem somos' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'O que você quer fazer hoje?' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Achar o ponto de coleta/ }),
        ).not.toBeInTheDocument();
    });

    it('hides the card of a section that is off and renumbers the others', async () => {
        stubSettings(homeKeys.filter((key) => key !== 'home.paths'));
        renderWith(<HomePage />);

        const heading = await screen.findByRole('heading', {
            name: 'O que você quer fazer hoje?',
        });
        const section = heading.closest('section') as HTMLElement;
        expect(within(section).queryByText('Doar tampinhas')).not.toBeInTheDocument();
        expect(within(section).getByText('Escolas, empresas e lojas')).toBeInTheDocument();
        expect(within(section).getByText('01')).toBeInTheDocument();
        expect(within(section).getByText('02')).toBeInTheDocument();
        expect(within(section).queryByText('03')).not.toBeInTheDocument();
    });

    it('drops the card of a page that is off', async () => {
        stubSettings([...homeKeys.filter((key) => key !== 'home.paths'), 'page.help']);
        renderWith(<HomePage />);

        const heading = await screen.findByRole('heading', {
            name: 'O que você quer fazer hoje?',
        });
        const section = heading.closest('section') as HTMLElement;
        expect(within(section).queryByText('Lar temporário e adoção')).not.toBeInTheDocument();
        expect(within(section).getByText('Escolas, empresas e lojas')).toBeInTheDocument();
    });
});
