import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/icon/Icon';
import { StateMessage } from '../../components/state-message/StateMessage';
import { useDocumentTitle } from '../../lib/use-document-title';
import {
    useAdminPoints,
    useDeactivatePoint,
    useGeocodePoint,
    usePickupSummary,
    useSavePoint,
} from '../../services/api/admin';
import type { AdminPoint, PointFilters } from '../../services/api/admin-types';
import { useNeighborhoods } from '../../services/api/public';
import styles from '../admin.module.css';
import { PointForm, type PointPrefill } from '../components/PointForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { PickupDialog } from '../components/PickupDialog';
import { PickupStatus } from '../components/PickupStatus';
import { SearchSelect } from '../components/SearchSelect';
import { useToast } from '../components/Toast';
import { CATEGORY_LABEL, PRECISION_LABEL } from '../labels';
import { usePickupAnnounce } from '../use-pickup-announce';

type Filter = 'all' | 'semtel' | 'aprox';
const TABS: [Filter, string][] = [
    ['all', 'Todos'],
    ['semtel', 'Sem telefone'],
    ['aprox', 'Posição aproximada'],
];

function useDebounced<T>(value: T, delay = 350): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

export function PointsPage() {
    useDocumentTitle('Pontos de coleta | Painel Patinhas');
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const location = useLocation();
    const prefill = (location.state as { prefill?: PointPrefill } | null)?.prefill;
    const filter: Filter =
        params.get('filtro') === 'semtel'
            ? 'semtel'
            : params.get('filtro') === 'aprox'
              ? 'aprox'
              : 'all';
    const [search, setSearch] = useState('');
    const [neighborhoodId, setNeighborhoodId] = useState('');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<AdminPoint | 'new' | null>(
        params.get('novo') === '1' ? 'new' : null,
    );
    const q = useDebounced(search.trim());

    const filters: PointFilters = {
        page,
        ...(q ? { q } : {}),
        ...(neighborhoodId ? { neighborhoodId } : {}),
        ...(filter === 'semtel' ? { missingPhone: true } : {}),
        ...(filter === 'aprox' ? { approximateLocation: true } : {}),
    };
    const list = useAdminPoints(filters);
    const neighborhoods = useNeighborhoods();
    const geocode = useGeocodePoint();
    const deactivate = useDeactivatePoint();
    const restore = useSavePoint();
    const [removing, setRemoving] = useState<AdminPoint | null>(null);
    const [pickupFor, setPickupFor] = useState<AdminPoint | null>(null);
    const pickupSummary = usePickupSummary();
    const announcePickup = usePickupAnnounce();
    const neighborhoodOptions = useMemo(
        () => (neighborhoods.data ?? []).map((item) => ({ value: item.id, label: item.name })),
        [neighborhoods.data],
    );
    const summaryByPoint = useMemo(
        () => new Map((pickupSummary.data ?? []).map((item) => [item.pointId, item])),
        [pickupSummary.data],
    );

    function setFilter(next: Filter) {
        const copy = new URLSearchParams(params);
        if (next === 'all') copy.delete('filtro');
        else copy.set('filtro', next);
        setParams(copy, { replace: true });
        setPage(1);
    }

    return (
        <>
            {editing ? (
                <PointForm
                    key={editing === 'new' ? 'new' : editing.id}
                    point={editing === 'new' ? null : editing}
                    prefill={editing === 'new' ? prefill : undefined}
                    neighborhoods={neighborhoods.data ?? []}
                    onClose={() => {
                        setEditing(null);
                        if (params.has('novo')) {
                            const copy = new URLSearchParams(params);
                            copy.delete('novo');
                            setParams(copy, { replace: true });
                        }
                    }}
                />
            ) : null}

            <div className={styles['card']}>
                <div className={styles['tool']}>
                    <div className={styles['search']}>
                        <Icon name="search" />
                        <input
                            type="search"
                            placeholder="Buscar por nome, rua ou bairro"
                            aria-label="Buscar ponto"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className={styles['toolSelect']}>
                        <SearchSelect
                            label="Filtrar por bairro"
                            hideLabel
                            options={neighborhoodOptions}
                            value={neighborhoodId}
                            emptyLabel="Todos os bairros"
                            placeholder="Filtrar por bairro"
                            noResults="Nenhum bairro com esse nome."
                            onChange={(next) => {
                                setNeighborhoodId(next);
                                setPage(1);
                            }}
                        />
                    </div>
                    <button
                        className={styles['btn']}
                        type="button"
                        onClick={() => setEditing('new')}
                    >
                        <Icon name="plus" /> Novo ponto
                    </button>
                </div>
                <div className={styles['tabs']}>
                    {TABS.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={filter === value}
                            onClick={() => setFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {list.isPending ? (
                    <StateMessage kind="loading">Carregando os pontos...</StateMessage>
                ) : null}
                {list.isError ? (
                    <StateMessage kind="error" onRetry={() => void list.refetch()}>
                        Não foi possível carregar os pontos.
                    </StateMessage>
                ) : null}
                {list.data ? (
                    <>
                        <div className={styles['tableWrap']}>
                            <table className={styles['table']}>
                                <thead>
                                    <tr>
                                        <th>Local</th>
                                        <th>Bairro</th>
                                        <th>Endereço</th>
                                        <th>Telefone</th>
                                        <th>Mapa</th>
                                        <th>Retirada</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.data.items.map((point) => (
                                        <tr key={point.id}>
                                            <td data-label="Local">
                                                <b>{point.name}</b>
                                                <br />
                                                <span className={styles['muted']}>
                                                    {CATEGORY_LABEL[point.category]}
                                                </span>
                                            </td>
                                            <td data-label="Bairro">{point.neighborhood}</td>
                                            <td data-label="Endereço">{point.address ?? '-'}</td>
                                            <td data-label="Telefone" className={styles['nowrap']}>
                                                {point.phone ? (
                                                    point.phone
                                                ) : (
                                                    <span
                                                        className={`${styles['chip']} ${styles['chipWarn']}`}
                                                    >
                                                        Sem telefone
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Mapa">
                                                <span
                                                    className={`${styles['chip']} ${point.locationPrecision === 'NEIGHBORHOOD' ? styles['chipWarn'] : styles['chipOk']}`}
                                                >
                                                    {PRECISION_LABEL[point.locationPrecision]}
                                                </span>
                                            </td>
                                            <td data-label="Retirada">
                                                <PickupStatus
                                                    summary={summaryByPoint.get(point.id)}
                                                />
                                            </td>
                                            <td className={styles['right']}>
                                                <div className={styles['iconRow']}>
                                                    <IconButton
                                                        icon="truck"
                                                        label="Registrar retirada"
                                                        onClick={() => setPickupFor(point)}
                                                    />
                                                    <IconButton
                                                        icon="file"
                                                        label="Ver certificado do ponto"
                                                        disabled={
                                                            !summaryByPoint.get(point.id)
                                                                ?.lastPickupOn
                                                        }
                                                        onClick={() =>
                                                            window.open(
                                                                `/certificado/${point.id}`,
                                                                '_blank',
                                                                'noopener',
                                                            )
                                                        }
                                                    />
                                                    <IconButton
                                                        icon="pencil"
                                                        label="Editar ponto"
                                                        onClick={() => setEditing(point)}
                                                    />
                                                    <IconButton
                                                        icon="locate"
                                                        label="Recalcular posição no mapa"
                                                        disabled={geocode.isPending}
                                                        onClick={() =>
                                                            geocode.mutate(point.id, {
                                                                onSuccess: (result) =>
                                                                    toast(
                                                                        result.locationPrecision ===
                                                                            'NEIGHBORHOOD'
                                                                            ? 'Não achei o endereço. Ficou a posição do bairro.'
                                                                            : 'Posição atualizada pelo endereço.',
                                                                    ),
                                                                onError: () =>
                                                                    toast(
                                                                        'Não foi possível recalcular agora.',
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                    <IconButton
                                                        icon="eyeOff"
                                                        label="Tirar do site"
                                                        tone="danger"
                                                        onClick={() => setRemoving(point)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {list.data.items.length === 0 ? (
                            search !== '' || neighborhoodId !== '' || filter !== 'all' ? (
                                <EmptyState
                                    icon="search"
                                    title="Nenhum ponto com esse filtro"
                                    hint="Tente outro bairro ou limpe a busca."
                                    action={
                                        <button
                                            className={`${styles['btn']} ${styles['ghost']}`}
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                setNeighborhoodId('');
                                                setFilter('all');
                                                setPage(1);
                                            }}
                                        >
                                            Limpar filtros
                                        </button>
                                    }
                                />
                            ) : (
                                <EmptyState
                                    icon="pin"
                                    title="Nenhum ponto cadastrado"
                                    hint="Cadastre o primeiro ponto de coleta para ele aparecer no mapa do site."
                                    action={
                                        <button
                                            className={styles['btn']}
                                            type="button"
                                            onClick={() => setEditing('new')}
                                        >
                                            Novo ponto
                                        </button>
                                    }
                                />
                            )
                        ) : null}
                        <div className={styles['pager']}>
                            <span>
                                Página {list.data.meta.page} de {list.data.meta.totalPages} (
                                {list.data.meta.total} pontos)
                            </span>
                            <div>
                                <button
                                    className={`${styles['btn']} ${styles['ghost']} ${styles['sm']}`}
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    Anterior
                                </button>
                                <button
                                    className={`${styles['btn']} ${styles['ghost']} ${styles['sm']}`}
                                    type="button"
                                    disabled={page >= list.data.meta.totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
            {pickupFor ? (
                <PickupDialog
                    key={pickupFor.id}
                    point={pickupFor}
                    onRegistered={announcePickup}
                    onClose={() => setPickupFor(null)}
                />
            ) : null}
            {removing ? (
                <ConfirmDialog
                    title="Tirar este ponto do site?"
                    message={`"${removing.name}" deixa de aparecer no mapa e na lista. Você pode cadastrar de novo depois.`}
                    confirmLabel="Tirar do site"
                    pending={deactivate.isPending}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => {
                        const pointId = removing.id;
                        deactivate.mutate(pointId, {
                            onSuccess: () =>
                                toast('Ponto tirado do site.', {
                                    label: 'Desfazer',
                                    onClick: () =>
                                        restore.mutate(
                                            { id: pointId, data: { status: 'ACTIVE' } },
                                            {
                                                onSuccess: () => toast('Ponto de volta ao site.'),
                                                onError: () => toast('Não foi possível desfazer.'),
                                            },
                                        ),
                                }),
                            onError: () => toast('Não foi possível tirar o ponto.'),
                        });
                        setRemoving(null);
                    }}
                />
            ) : null}
        </>
    );
}
