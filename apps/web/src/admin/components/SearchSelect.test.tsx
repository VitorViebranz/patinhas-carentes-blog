import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchSelect, type SearchOption } from './SearchSelect';

const OPTIONS: SearchOption[] = [
    { value: 'a', label: 'Escola Sol', detail: 'Centro' },
    { value: 'b', label: 'Loja Lua', detail: 'América' },
    { value: 'c', label: 'Colégio Alfa', detail: 'Atiradores' },
];

function Harness({
    emptyLabel,
    onChange,
    initial = '',
}: {
    emptyLabel?: string;
    onChange?: (value: string) => void;
    initial?: string;
}) {
    const [value, setValue] = useState(initial);
    return (
        <SearchSelect
            label="Ponto de coleta"
            options={OPTIONS}
            value={value}
            emptyLabel={emptyLabel}
            onChange={(next) => {
                setValue(next);
                onChange?.(next);
            }}
        />
    );
}

const combobox = () => screen.getByRole('combobox', { name: 'Ponto de coleta' });

describe('SearchSelect', () => {
    it('opens the full list when focused', async () => {
        render(<Harness />);

        await userEvent.click(combobox());

        expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3);
    });

    it('narrows the list while typing, ignoring accents and case', async () => {
        render(<Harness />);

        await userEvent.type(combobox(), 'AMERICA');

        const options = within(screen.getByRole('listbox')).getAllByRole('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent('Loja Lua');
    });

    it('finds by the detail as well as by the name', async () => {
        render(<Harness />);

        await userEvent.type(combobox(), 'atirad');

        expect(screen.getByRole('option', { name: /Colégio Alfa/ })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Escola Sol/ })).not.toBeInTheDocument();
    });

    it('picks an option with the mouse and shows it with its detail', async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        await userEvent.click(combobox());
        await userEvent.click(screen.getByRole('option', { name: /Loja Lua/ }));

        expect(onChange).toHaveBeenCalledWith('b');
        expect(combobox()).toHaveValue('Loja Lua (América)');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('picks with the keyboard: arrows to move, Enter to choose', async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        await userEvent.click(combobox());
        await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

        expect(onChange).toHaveBeenCalledWith('c');
    });

    it('closes with Escape without changing the choice', async () => {
        const onChange = vi.fn();
        render(<Harness initial="a" onChange={onChange} />);

        await userEvent.click(combobox());
        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
        expect(combobox()).toHaveValue('Escola Sol (Centro)');
    });

    it('says when nothing matches', async () => {
        render(<Harness />);

        await userEvent.type(combobox(), 'zzz');

        expect(screen.getByText('Nada encontrado.')).toBeInTheDocument();
    });

    it('offers a first option to clear the choice when an empty label is given', async () => {
        const onChange = vi.fn();
        render(<Harness emptyLabel="Todos os pontos" initial="b" onChange={onChange} />);

        await userEvent.click(combobox());
        await userEvent.click(screen.getByRole('option', { name: 'Todos os pontos' }));

        expect(onChange).toHaveBeenCalledWith('');
        expect(combobox()).toHaveValue('');
        expect(combobox()).toHaveAttribute('placeholder', 'Todos os pontos');
    });

    it('hides the clear option while the person is searching', async () => {
        render(<Harness emptyLabel="Todos os pontos" />);

        await userEvent.type(combobox(), 'sol');

        expect(screen.queryByRole('option', { name: 'Todos os pontos' })).not.toBeInTheDocument();
    });

    it('marks the current choice in the list', async () => {
        render(<Harness initial="c" />);

        await userEvent.click(combobox());

        expect(screen.getByRole('option', { name: /Colégio Alfa/ })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });
});
