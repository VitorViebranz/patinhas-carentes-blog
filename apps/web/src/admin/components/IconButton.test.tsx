import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
    it('is named by its label and calls onClick', async () => {
        const onClick = vi.fn();
        render(<IconButton icon="pencil" label="Editar ponto" onClick={onClick} />);

        await userEvent.click(screen.getByRole('button', { name: 'Editar ponto' }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick while disabled', async () => {
        const onClick = vi.fn();
        render(<IconButton icon="locate" label="Recalcular" disabled onClick={onClick} />);

        await userEvent.click(screen.getByRole('button', { name: 'Recalcular' }));

        expect(onClick).not.toHaveBeenCalled();
    });

    it('shows the tooltip on hover outside the table and hides it with Escape', async () => {
        render(<IconButton icon="pencil" label="Editar ponto" onClick={vi.fn()} />);

        await userEvent.hover(screen.getByRole('button', { name: 'Editar ponto' }));
        const bubble = screen.getByText('Editar ponto');
        expect(bubble.parentElement).toBe(document.body);

        await userEvent.keyboard('{Escape}');
        expect(screen.queryByText('Editar ponto')).not.toBeInTheDocument();
    });
});
