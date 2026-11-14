import { normalizeText } from '@patinhas/shared';
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Neighborhood } from '../../services/api/types';
import styles from '../admin.module.css';

interface NeighborhoodPickerProps {
    label: string;
    neighborhoods: readonly Neighborhood[];
    value: string;
    onChange: (id: string) => void;
    onCreate: (name: string) => void;
    creating?: boolean;
    error?: string | undefined;
    hint?: ReactNode;
}

type Item = { kind: 'hood'; hood: Neighborhood } | { kind: 'create'; name: string };

function itemsFor(neighborhoods: readonly Neighborhood[], query: string): Item[] {
    const needle = normalizeText(query);
    const found = neighborhoods.filter((hood) => normalizeText(hood.name).includes(needle));
    const exact = neighborhoods.some((hood) => normalizeText(hood.name) === needle);
    const items: Item[] = found.map((hood) => ({ kind: 'hood', hood }));
    if (needle.length >= 2 && !exact) items.push({ kind: 'create', name: query.trim() });
    return items;
}

export function NeighborhoodPicker({
    label,
    neighborhoods,
    value,
    onChange,
    onCreate,
    creating = false,
    error,
    hint,
}: NeighborhoodPickerProps) {
    const inputId = useId();
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const selected = neighborhoods.find((hood) => hood.id === value);
    const items = useMemo(() => itemsFor(neighborhoods, query), [neighborhoods, query]);
    const shown = open ? query : (selected?.name ?? '');

    function openList() {
        if (open) return;
        setQuery('');
        setActive(0);
        setOpen(true);
    }

    function pick(item: Item | undefined) {
        if (!item) return;
        setOpen(false);
        if (item.kind === 'hood') onChange(item.hood.id);
        else onCreate(item.name);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openList();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive((current) => Math.max(0, Math.min(items.length - 1, current + step)));
        } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            pick(items[active]);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div className={styles['fld']}>
            <label htmlFor={inputId}>{label}</label>
            <div
                className={styles['combo']}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
                }}
            >
                <input
                    id={inputId}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-invalid={error ? true : undefined}
                    aria-activedescendant={open ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    placeholder="Digite para buscar o bairro"
                    value={shown}
                    onFocus={openList}
                    onClick={openList}
                    onChange={(event) => {
                        setOpen(true);
                        setQuery(event.target.value);
                        setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                />
                {open ? (
                    <ul id={listId} role="listbox" className={styles['comboList']}>
                        {items.map((item, index) => (
                            <li
                                key={item.kind === 'hood' ? item.hood.id : 'create'}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={item.kind === 'hood' && item.hood.id === value}
                                data-active={index === active}
                                data-create={item.kind === 'create' ? true : undefined}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                }}
                                onMouseEnter={() => {
                                    setActive(index);
                                }}
                                onClick={() => {
                                    pick(item);
                                }}
                            >
                                {item.kind === 'hood' ? (
                                    <>
                                        {item.hood.name}
                                        {item.hood.outsideMainArea ? (
                                            <small>fora de Joinville</small>
                                        ) : null}
                                    </>
                                ) : (
                                    <>Cadastrar &quot;{item.name}&quot; como novo bairro</>
                                )}
                            </li>
                        ))}
                        {items.length === 0 ? (
                            <li role="presentation" className={styles['comboEmpty']}>
                                Nenhum bairro com esse nome.
                            </li>
                        ) : null}
                    </ul>
                ) : null}
            </div>
            {creating ? <small>Procurando o bairro no mapa...</small> : null}
            {hint && !creating ? <small>{hint}</small> : null}
            {error ? <span className={styles['fieldError']}>{error}</span> : null}
        </div>
    );
}
