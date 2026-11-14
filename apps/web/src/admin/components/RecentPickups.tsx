import { useState } from 'react';
import { StateMessage } from '../../components/state-message/StateMessage';
import { formatDay, formatKg } from '../../lib/format';
import { ApiError } from '../../services/api/client';
import { useDeletePickup, useRecentPickups } from '../../services/api/admin';
import type { AdminPickup } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';
import { useToast } from './Toast';

export function RecentPickups() {
    const toast = useToast();
    const recent = useRecentPickups();
    const remove = useDeletePickup();
    const [removing, setRemoving] = useState<AdminPickup | null>(null);

    return (
        <div className={styles['card']}>
            <div className={styles['cardHead']}>
                <h2>Últimas retiradas</h2>
            </div>
            {recent.isPending ? <StateMessage kind="loading">Carregando...</StateMessage> : null}
            {recent.isError ? (
                <StateMessage kind="error" onRetry={() => void recent.refetch()}>
                    Não foi possível carregar as retiradas.
                </StateMessage>
            ) : null}
            {recent.data && recent.data.length === 0 ? (
                <EmptyState
                    icon="truck"
                    title="Nenhuma retirada ainda"
                    hint="Registre a primeira no formulário ao lado."
                />
            ) : null}
            {recent.data && recent.data.length > 0 ? (
                <ul className={styles['pickupRows']}>
                    {recent.data.map((item) => (
                        <li key={item.id} className={styles['recentRow']}>
                            <div>
                                <b>{item.pointName}</b>
                                <span className={styles['muted']}>
                                    {formatDay(item.pickedUpOn)}
                                </span>
                            </div>
                            <b>{formatKg(item.kg)}</b>
                            <IconButton
                                icon="trash"
                                label="Apagar retirada"
                                tone="danger"
                                onClick={() => setRemoving(item)}
                            />
                        </li>
                    ))}
                </ul>
            ) : null}
            {removing ? (
                <ConfirmDialog
                    title="Apagar esta retirada?"
                    message={`${formatKg(removing.kg)} de ${removing.pointName} (${formatDay(removing.pickedUpOn)}) saem do placar e do certificado.`}
                    confirmLabel="Apagar retirada"
                    pending={remove.isPending}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => {
                        remove.mutate(removing.id, {
                            onSuccess: () => toast('Retirada apagada.'),
                            onError: (error) =>
                                toast(
                                    error instanceof ApiError && error.status === 403
                                        ? 'Só um administrador apaga uma retirada antiga ou de outra pessoa.'
                                        : 'Não foi possível apagar a retirada.',
                                ),
                        });
                        setRemoving(null);
                    }}
                />
            ) : null}
        </div>
    );
}
