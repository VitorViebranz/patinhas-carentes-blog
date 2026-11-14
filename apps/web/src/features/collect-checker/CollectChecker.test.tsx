import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CollectChecker } from './CollectChecker';

describe('CollectChecker', () => {
    it('starts with the summary of what can and cannot be taken', () => {
        render(<CollectChecker />);

        const verdict = screen.getByRole('status');
        expect(verdict).toHaveTextContent('Toque em um item para conferir');
        expect(verdict).toHaveTextContent('Pode:');
        expect(verdict).toHaveTextContent('Não pode:');
    });

    it('says an item cannot be taken and switches to the matching photo', async () => {
        const user = userEvent.setup();
        const { container } = render(<CollectChecker />);

        await user.click(screen.getByRole('button', { name: 'Lacre de latinha' }));

        expect(screen.getByRole('status')).toHaveTextContent('Não pode levar');
        expect(screen.getByRole('status')).toHaveTextContent('Lacre de latinha');
        expect(container.querySelector('[data-photo="no"]')).toHaveAttribute('data-on', 'true');
        expect(container.querySelector('[data-photo="yes"]')).toHaveAttribute('data-on', 'false');
    });

    it('says an item can be taken and marks the checked chips', async () => {
        const user = userEvent.setup();
        render(<CollectChecker />);

        await user.click(screen.getByRole('button', { name: 'Chocolatado' }));
        await user.click(screen.getByRole('button', { name: 'Rolha' }));

        expect(screen.getByRole('button', { name: 'Chocolatado' })).toHaveAttribute(
            'data-result',
            'yes',
        );
        expect(screen.getByRole('button', { name: 'Rolha' })).toHaveAttribute('data-result', 'no');
        expect(screen.getByRole('button', { name: 'Seringa' })).not.toHaveAttribute('data-result');
    });

    it('goes back to the summary when the same item is tapped again', async () => {
        const user = userEvent.setup();
        render(<CollectChecker />);
        const chip = screen.getByRole('button', { name: 'Caneta' });

        await user.click(chip);
        expect(chip).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('status')).toHaveTextContent('Pode levar');

        await user.click(chip);
        expect(chip).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('status')).toHaveTextContent('Toque em um item para conferir');
    });
});
