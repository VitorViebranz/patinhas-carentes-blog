import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StateMessage } from '../../components/state-message/StateMessage';
import { useDocumentTitle } from '../../lib/use-document-title';
import {
    useAdminRequests,
    useDeleteRequest,
    useSession,
    useSetRequestStatus,
} from '../../services/api/admin';
import type { AdminHelpRequest } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { useToast } from '../components/Toast';
import { INSTITUTION_LABEL, REQUEST_TYPE_LABEL, formatDateTime } from '../labels';
import { whatsappUrl } from '@patinhas/shared';

type Tab = 'all' | 'NEW' | 'ANSWERED';
const TABS: [Tab, string][] = [
    ['all', 'Todas'],
    ['NEW', 'Novas'],
    ['ANSWERED', 'Respondidas'],
];

function detail(item: AdminHelpRequest): string {
    const parts: string[] = [];
    if (item.institutionName) {
        parts.push(
            item.institutionType
                ? `${INSTITUTION_LABEL[item.institutionType]}: ${item.institutionName}`
                : item.institutionName,
        );
    }
    if (item.wantsTalk) parts.push('quer palestra');
    if (item.animalCapacity) parts.push(`recebe até ${item.animalCapacity} animal(is)`);
    return parts.join(', ') || '-';
}

function addressLine(item: AdminHelpRequest): string | null {
    const parts = [item.address, item.neighborhoodName, item.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}

function contactHref(contact: string): string {
    if (contact.includes('@')) return `mailto:${contact}`;
    const digits = contact.replace(/\D/g, '');
    return whatsappUrl(digits.length <= 11 ? `55${digits}` : digits);
}

export function RequestsPage() {
    useDocumentTitle('Solicitações | Painel Patinhas');
    const toast = useToast();
    const navigate = useNavigate();
    const isAdmin = useSession().data?.role === 'ADMIN';
    const [tab, setTab] = useState<Tab>('all');
    const [page, setPage] = useState(1);
    const list = useAdminRequests(tab === 'all' ? undefined : tab, page);
    const setStatus = useSetRequestStatus();
    const remove = useDeleteRequest();
    const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

    function change(next: Tab) {
        setTab(next);
        setPage(1);
    }

    if (list.isPending) return <StateMessage kind="loading">Carregando os pedidos...</StateMessage>;
    if (list.isError) {
        return (
            <StateMessage kind="error" onRetry={() => void list.refetch()}>
                Não foi possível carregar os pedidos.
            </StateMessage>
        );
    }
    const { items, meta } = list.data;

    return (
        <div className={styles['card']}>
            <div className={styles['tabs']}>
                {TABS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={tab === value}
                        onClick={() => change(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {items.length === 0 ? (
                <EmptyState
                    icon="inbox"
                    title="Nenhum pedido aqui"
                    hint="Quando alguém preencher um formulário no site, o pedido aparece nesta lista."
                />
            ) : (
                <div className={styles['tableWrap']}>
                    <table className={styles['table']}>
                        <thead>
                            <tr>
                                <th>Quem pediu</th>
                                <th>Tipo</th>
                                <th>Detalhes</th>
                                <th>Contato</th>
                                <th>Recebido</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td data-label="Quem pediu">
                                        <b>{item.requesterName}</b>
                                    </td>
                                    <td data-label="Tipo">{REQUEST_TYPE_LABEL[item.type]}</td>
                                    <td data-label="Detalhes" className={styles['stack']}>
                                        {detail(item)}
                                        {addressLine(item) ? (
                                            <div className={styles['muted']}>
                                                {addressLine(item)}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td data-label="Contato">
                                        <a
                                            href={contactHref(item.contact)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {item.contact}
                                        </a>
                                    </td>
                                    <td data-label="Recebido">{formatDateTime(item.createdAt)}</td>
                                    <td data-label="Status">
                                        <span
                                            className={`${styles['chip']} ${item.status === 'NEW' ? styles['chipNew'] : styles['chipDone']}`}
                                        >
                                            {item.status === 'NEW' ? 'Nova' : 'Respondida'}
                                        </span>
                                    </td>
                                    <td className={styles['right']}>
                                        <div className={styles['iconRow']}>
                                            <IconButton
                                                icon={item.status === 'NEW' ? 'check' : 'refresh'}
                                                label={
                                                    item.status === 'NEW'
                                                        ? 'Marcar como respondido'
                                                        : 'Reabrir pedido'
                                                }
                                                disabled={setStatus.isPending}
                                                onClick={() =>
                                                    setStatus.mutate(
                                                        {
                                                            id: item.id,
                                                            status:
                                                                item.status === 'NEW'
                                                                    ? 'ANSWERED'
                                                                    : 'NEW',
                                                        },
                                                        {
                                                            onSuccess: () =>
                                                                toast(
                                                                    item.status === 'NEW'
                                                                        ? 'Marcado como respondido.'
                                                                        : 'Voltou para novas.',
                                                                    {
                                                                        label: 'Desfazer',
                                                                        onClick: () =>
                                                                            setStatus.mutate({
                                                                                id: item.id,
                                                                                status: item.status,
                                                                            }),
                                                                    },
                                                                ),
                                                            onError: () =>
                                                                toast(
                                                                    'Não foi possível atualizar.',
                                                                ),
                                                        },
                                                    )
                                                }
                                            />
                                            {item.type === 'COLLECTION_POINT' && item.address ? (
                                                <IconButton
                                                    icon="pin"
                                                    label="Cadastrar como ponto"
                                                    onClick={() =>
                                                        navigate('/admin/pontos?novo=1', {
                                                            state: {
                                                                prefill: {
                                                                    name:
                                                                        item.institutionName ?? '',
                                                                    phone: item.contact.includes(
                                                                        '@',
                                                                    )
                                                                        ? ''
                                                                        : item.contact,
                                                                    postalCode:
                                                                        item.postalCode ?? '',
                                                                    address: item.address,
                                                                    neighborhoodName:
                                                                        item.neighborhoodName ?? '',
                                                                },
                                                            },
                                                        })
                                                    }
                                                />
                                            ) : null}
                                            {isAdmin ? (
                                                <IconButton
                                                    icon="trash"
                                                    label="Apagar pedido"
                                                    tone="danger"
                                                    onClick={() =>
                                                        setRemoving({
                                                            id: item.id,
                                                            name: item.requesterName,
                                                        })
                                                    }
                                                />
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className={styles['pager']}>
                <span>
                    Página {meta.page} de {meta.totalPages} ({meta.total} pedidos)
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
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Próxima
                    </button>
                </div>
            </div>
            <p className={`${styles['muted']} ${styles['gapTop10']}`}>
                Os pedidos chegam sozinhos pelos formulários do site. A ação é marcar como
                respondido depois de chamar a pessoa.
            </p>
            {removing ? (
                <ConfirmDialog
                    title="Apagar este pedido?"
                    message={`O pedido de ${removing.name} será apagado e isso não pode ser desfeito.`}
                    confirmLabel="Apagar pedido"
                    pending={remove.isPending}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => {
                        remove.mutate(removing.id, {
                            onSuccess: () => toast('Pedido apagado.'),
                            onError: () => toast('Não foi possível apagar.'),
                        });
                        setRemoving(null);
                    }}
                />
            ) : null}
        </div>
    );
}
