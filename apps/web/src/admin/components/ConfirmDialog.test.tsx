import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
});

function setup(pending = false) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
        <ConfirmDialog
            title="Tirar este ponto do site?"
            message="Some do mapa."
            confirmLabel="Tirar do site"
            pending={pending}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />,
    );
    return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
    it('is named by its title and described by its message', () => {
        setup();

        const dialog = screen.getByRole('dialog', { name: 'Tirar este ponto do site?' });
        expect(dialog).toHaveAccessibleDescription('Some do mapa.');
    });

    it('confirms and cancels through the buttons', async () => {
        const { onConfirm, onCancel } = setup();

        await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        await userEvent.click(screen.getByRole('button', { name: 'Tirar do site' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('blocks the confirm button while the request is pending', () => {
        setup(true);

        expect(screen.getByRole('button', { name: 'Tirar do site' })).toBeDisabled();
    });
});
