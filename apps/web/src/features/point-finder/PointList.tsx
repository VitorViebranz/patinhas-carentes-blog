import { directionsUrl, formatDistance, telHref } from '@patinhas/shared';
import { useEffect, useId, useRef } from 'react';
import { buttonClass } from '../../components/button/Button';
import { Icon } from '../../components/icon/Icon';
import type { CollectionPoint } from '../../services/api/types';
import type { FinderEntry, Selection } from './use-point-finder';
import styles from './point-finder.module.css';

interface PointListProps {
    id: string;
    onCollapse: () => void;
    results: FinderEntry[];
    shown: number;
    query: string;
    searchActive: boolean;
    selection: Selection | null;
    onQuery: (query: string) => void;
    onShowMore: () => void;
    onSelect: (point: CollectionPoint, source: Selection['source']) => void;
}

export function PointList({
    id,
    onCollapse,
    results,
    shown,
    query,
    searchActive,
    selection,
    onQuery,
    onShowMore,
    onSelect,
}: PointListProps) {
    const searchId = useId();
    const listRef = useRef<HTMLDivElement>(null);
    const total = results.length;

    useEffect(() => {
        if (selection?.source !== 'map') return;
        const row = listRef.current?.querySelector(`[data-point-id="${CSS.escape(selection.id)}"]`);
        row?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }, [selection]);

    return (
        <div className={styles['listColumn']} id={id}>
            <label className={styles['label']} htmlFor={searchId}>
                Procurar por nome ou rua
            </label>
            <div className={styles['pill']}>
                <Icon name="search" className={styles['pillIcon']} />
                <input
                    id={searchId}
                    className={styles['pillInput']}
                    type="search"
                    placeholder="Ex.: pet shop, Anita Garibaldi"
                    autoComplete="off"
                    value={query}
                    onChange={(event) => {
                        onQuery(event.target.value);
                    }}
                />
            </div>
            <div className={styles['countRow']}>
                <p className={styles['count']} aria-live="polite">
                    {total === 1 ? '1 ponto' : `${total} pontos`}
                </p>
                <button
                    type="button"
                    className={styles['collapse']}
                    aria-expanded={true}
                    aria-controls={id}
                    onClick={onCollapse}
                >
                    Recolher lista <Icon name="go" />
                </button>
            </div>

            <div className={styles['list']} ref={listRef}>
                {results.slice(0, shown).map((entry, index) => {
                    const point = entry.item;
                    const isSelected = selection?.id === point.id;
                    return (
                        <div
                            key={point.id}
                            data-point-id={point.id}
                            className={`${styles['row']} ${isSelected ? styles['rowSelected'] : ''}`}
                            aria-current={isSelected ? 'true' : undefined}
                            onClick={(event) => {
                                if ((event.target as HTMLElement).closest('a, button')) return;
                                onSelect(point, 'list');
                            }}
                        >
                            {index === 0 && !searchActive && entry.distanceMeters !== null ? (
                                <span className={styles['rank']}>Mais perto</span>
                            ) : null}
                            <div className={styles['rowHead']}>
                                <div>
                                    <b className={styles['rowName']}>{point.name}</b>
                                    <span className={styles['rowAddress']}>
                                        {point.address ? `${point.address}, ` : ''}bairro{' '}
                                        {point.neighborhood}
                                    </span>
                                </div>
                                {entry.distanceMeters === null ? null : (
                                    <span className={styles['distance']}>
                                        {formatDistance(entry.distanceMeters).replace(/^a /, '')}
                                    </span>
                                )}
                            </div>
                            {point.locationPrecision === 'NEIGHBORHOOD' ? (
                                <span className={styles['note']}>
                                    Posição aproximada pelo bairro
                                </span>
                            ) : null}
                            <div className={styles['rowActions']}>
                                <a
                                    className={buttonClass({ variant: 'sun', size: 'sm' })}
                                    href={directionsUrl(point)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Como chegar
                                </a>
                                {point.phone ? (
                                    <a
                                        className={buttonClass({ variant: 'line', size: 'sm' })}
                                        href={telHref(point.phone)}
                                        aria-label={`Ligar para ${point.name} ${point.phone}`}
                                    >
                                        Ligar
                                    </a>
                                ) : null}
                                <button
                                    type="button"
                                    className={buttonClass({ variant: 'line', size: 'sm' })}
                                    aria-label={`Ver ${point.name} no mapa`}
                                    onClick={() => {
                                        onSelect(point, 'list');
                                    }}
                                >
                                    Ver no mapa
                                </button>
                            </div>
                        </div>
                    );
                })}
                {total === 0 ? (
                    <div className={styles['empty']}>Nenhum ponto encontrado para essa busca.</div>
                ) : null}
            </div>

            {total > shown ? (
                <button
                    type="button"
                    className={buttonClass({
                        variant: 'line',
                        size: 'sm',
                        className: styles['more'],
                    })}
                    onClick={onShowMore}
                >
                    Mostrar mais pontos
                </button>
            ) : null}
        </div>
    );
}
