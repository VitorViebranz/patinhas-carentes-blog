import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ImpactMeter } from './ImpactMeter';

const settings = { gramsPerCap: 2.5, kgPriceBrl: 2, spayCostBrl: 350, vaccineDoseCostBrl: 60 };

function setup() {
    render(<ImpactMeter settings={settings} />);
    return {
        user: userEvent.setup(),
        range: screen.getByRole('slider', { name: 'Quantidade de tampinhas' }),
    };
}

describe('ImpactMeter', () => {
    it('starts at 100 caps, a small amount a person may have at home', () => {
        setup();

        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('cerca de 250 g')).toBeInTheDocument();
        expect(screen.getByText('R$ 0,50')).toBeInTheDocument();
        expect(screen.getByText('ou 0,14% de uma castração')).toBeInTheDocument();
    });

    it('shows what 100 people donating the same amount can do', () => {
        setup();

        expect(
            screen.getByText(
                'Se 100 pessoas doarem a mesma quantidade, são 10.000 tampinhas: R$ 50,00, ou 14% de uma castração.',
            ),
        ).toBeInTheDocument();
    });

    it('adds and removes a hundred caps with the buttons', async () => {
        const { user, range } = setup();

        await user.click(screen.getByRole('button', { name: 'Mais cem tampinhas' }));
        expect(range).toHaveValue('200');
        expect(screen.getByText('200')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Menos cem tampinhas' }));
        await user.click(screen.getByRole('button', { name: 'Menos cem tampinhas' }));
        expect(range).toHaveValue('0');
    });

    it('never goes below zero', async () => {
        const { user, range } = setup();

        await user.click(screen.getByRole('button', { name: 'Menos cem tampinhas' }));
        await user.click(screen.getByRole('button', { name: 'Menos cem tampinhas' }));

        expect(range).toHaveValue('0');
        expect(screen.getByText('nenhuma ainda')).toBeInTheDocument();
        expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
    });

    it('stops at the end of the bar, 5 kg of caps', () => {
        const { range } = setup();

        fireEvent.change(range, { target: { value: '2000' } });

        expect(range).toHaveValue('2000');
        expect(screen.getByText('cerca de 5 kg')).toBeInTheDocument();
        expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
        expect(screen.getByText('ou 2,9% de uma castração')).toBeInTheDocument();
    });

    it('shows R$ 2.00 and 1 kg at 400 caps', () => {
        const { range } = setup();

        fireEvent.change(range, { target: { value: '400' } });

        expect(screen.getByText('R$ 2,00')).toBeInTheDocument();
        expect(screen.getByText('cerca de 1 kg')).toBeInTheDocument();
    });

    it('announces changes politely and exposes a readable value', () => {
        const { range } = setup();

        expect(range).toHaveAttribute('aria-valuetext', '100 tampinhas');
        const result = screen.getAllByText(/de uma castração/)[0]?.closest('[aria-live]');
        expect(result).toHaveAttribute('aria-live', 'polite');
        expect(range.closest('[aria-live]')).toBeNull();
    });

    it('explains the calculation using the configured prices and weights', () => {
        setup();

        expect(screen.getByText(/o quilo de tampinha rende R\$ 2,00/)).toBeInTheDocument();
        expect(screen.getByText(/uma castração custa em média R\$ 350,00/)).toBeInTheDocument();
        expect(screen.getByText(/175 kg ou 70\.000 tampinhas/)).toBeInTheDocument();
        expect(screen.getByText(/2,5 g por tampinha, 400 por quilo/)).toBeInTheDocument();
    });
});
