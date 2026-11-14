import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PixCard } from './PixCard';

afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('PixCard', () => {
    it('shows the key formatted as CNPJ and copies the raw digits', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        render(<PixCard pixKey="45559299000157" whatsapp="5547991457757" />);

        expect(screen.getByText('45.559.299/0001-57')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Copiar chave Pix/ }));

        expect(writeText).toHaveBeenCalledWith('45559299000157');
        expect(await screen.findByRole('button', { name: /Chave copiada/ })).toBeInTheDocument();
    });

    it('falls back to WhatsApp while no key is configured', () => {
        render(<PixCard pixKey={null} whatsapp="5547991457757" />);

        expect(screen.getByRole('link', { name: /Chamar no WhatsApp/ })).toHaveAttribute(
            'href',
            'https://wa.me/5547991457757',
        );
        expect(screen.queryByRole('button', { name: /Copiar/ })).not.toBeInTheDocument();
    });
});
