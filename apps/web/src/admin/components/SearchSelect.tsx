import { normalizeText } from '@patinhas/shared';
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from '../admin.module.css';

export interface SearchOption {
    value: string;
    label: string;
    detail?: string;
}

interface SearchSelectProps {
    label: string;
    hideLabel?: boolean | undefined;
    options: readonly SearchOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string | undefined;
    emptyLabel?: string | undefined;
    noResults?: string | undefined;
    error?: string | undefined;
    hint?: ReactNode;
}

function matching(
    options: readonly SearchOption[],
    emptyLabel: string | undefined,
    query: string,
): SearchOption[] {
    const needle = normalizeText(query);
    const found = needle
        ? options.filter((option) =>
              normalizeText(`${option.label} ${option.detail ?? ''}`).includes(needle),
          )
        : [...options];
    return emptyLabel && !needle ? [{ value: '', label: emptyLabel }, ...found] : found;
}

function describe(option: SearchOption | undefined): string {
    if (!option) return '';
    return option.detail ? `${option.label} (${option.detail})` : option.label;
}

export function SearchSelect({
    label,
    hideLabel = false,
    options,
    value,
    onChange,
    placeholder = 'Digite para buscar',
    emptyLabel,
    noResults = 'Nada encontrado.',
    error,
    hint,
}: SearchSelectProps) {
    const inputId = useId();
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const selected = options.find((option) => option.value === value);
    const items = useMemo(() => matching(options, emptyLabel, query), [options, emptyLabel, query]);
    const shown = open ? query : describe(selected);

    useEffect(() => {
        if (!open) return;
        document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
    }, [open, active, listId]);

    function openList() {
        if (open) return;
        setQuery('');
        setActive(0);
        setOpen(true);
    }

    function pick(item: SearchOption | undefined) {
        if (!item) return;
        setOpen(false);
        onChange(item.value);
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
            {hideLabel ? null : <label htmlFor={inputId}>{label}</label>}
            <div
                className={styles['combo']}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
                }}
            >
                <input
                    id={inputId}
                    role="combobox"
                    aria-label={hideLabel ? label : undefined}
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-invalid={error ? true : undefined}
                    aria-activedescendant={open ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    placeholder={!value && emptyLabel ? emptyLabel : placeholder}
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
                                key={item.value || 'all'}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={item.value === value}
                                data-active={index === active}
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
                                {item.label}
                                {item.detail ? <small>{item.detail}</small> : null}
                            </li>
                        ))}
                        {items.length === 0 ? (
                            <li role="presentation" className={styles['comboEmpty']}>
                                {noResults}
                            </li>
                        ) : null}
                    </ul>
                ) : null}
            </div>
            {hint ? <small>{hint}</small> : null}
            {error ? <span className={styles['fieldError']}>{error}</span> : null}
        </div>
    );
}
