import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function Trigger({ onUndo }: { onUndo: () => void }) {
    const toast = useToast();
    return (
        <button
            type="button"
            onClick={() => toast('Ponto tirado do site.', { label: 'Desfazer', onClick: onUndo })}
        >
            Tirar
        </button>
    );
}

describe('Toast', () => {
    it('runs the undo action and closes the message', async () => {
        const onUndo = vi.fn();
        render(
            <ToastProvider>
                <Trigger onUndo={onUndo} />
            </ToastProvider>,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Tirar' }));
        expect(screen.getByText('Ponto tirado do site.')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));

        expect(onUndo).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Ponto tirado do site.')).not.toBeInTheDocument();
    });
});
