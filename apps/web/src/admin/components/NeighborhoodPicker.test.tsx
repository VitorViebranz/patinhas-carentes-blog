import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Neighborhood } from '../../services/api/types';
import { NeighborhoodPicker } from './NeighborhoodPicker';

function hood(id: string, name: string, outsideMainArea = false): Neighborhood {
    return {
        id,
        name,
        slug: id,
        latitude: -26.3,
        longitude: -48.8,
        outsideMainArea,
        pointCount: 0,
    };
}

const hoods = [hood('1', 'Bom Retiro'), hood('2', 'Boa Vista'), hood('3', 'Garuva', true)];

function Harness({ onCreate }: { onCreate: (name: string) => void }) {
    const [value, setValue] = useState('');
    return (
        <NeighborhoodPicker
            label="Bairro"
            neighborhoods={hoods}
            value={value}
            onChange={setValue}
            onCreate={onCreate}
        />
    );
}

describe('NeighborhoodPicker', () => {
    it('lists every neighborhood when focused and marks the ones outside Joinville', async () => {
        const user = userEvent.setup();
        render(<Harness onCreate={vi.fn()} />);

        await user.click(screen.getByRole('combobox', { name: 'Bairro' }));

        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(screen.getByText('fora de Joinville')).toBeInTheDocument();
    });

    it('filters while typing, ignoring case and accents', async () => {
        const user = userEvent.setup();
        render(<Harness onCreate={vi.fn()} />);

        await user.type(screen.getByRole('combobox', { name: 'Bairro' }), 'BOA');

        expect(screen.getByRole('option', { name: 'Boa Vista' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Bom Retiro' })).not.toBeInTheDocument();
    });

    it('selects with the keyboard and shows the chosen name', async () => {
        const user = userEvent.setup();
        render(<Harness onCreate={vi.fn()} />);
        const input = screen.getByRole('combobox', { name: 'Bairro' });

        await user.click(input);
        await user.keyboard('{ArrowDown}{Enter}');

        expect(input).toHaveValue('Boa Vista');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('offers to register a name that is not in the list', async () => {
        const onCreate = vi.fn();
        const user = userEvent.setup();
        render(<Harness onCreate={onCreate} />);

        await user.type(screen.getByRole('combobox', { name: 'Bairro' }), 'Jardim Novo');
        await user.click(screen.getByRole('option', { name: /Cadastrar "Jardim Novo"/ }));

        expect(onCreate).toHaveBeenCalledWith('Jardim Novo');
    });

    it('does not offer to register a name that already exists', async () => {
        const user = userEvent.setup();
        render(<Harness onCreate={vi.fn()} />);

        await user.type(screen.getByRole('combobox', { name: 'Bairro' }), 'bom retiro');

        expect(screen.queryByRole('option', { name: /Cadastrar/ })).not.toBeInTheDocument();
    });
});
