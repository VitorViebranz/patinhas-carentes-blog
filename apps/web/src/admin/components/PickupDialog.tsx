import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../components/icon/Icon';
import { formatDay, formatKg, todayInBrazil } from '../../lib/format';
import { ApiError } from '../../services/api/client';
import { useCreatePickup, useDeletePickup, usePointPickups } from '../../services/api/admin';
import type { AdminPickup, AdminPoint } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { parseKg } from '../pickup-input';
import { AdminInput } from './AdminField';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

interface PickupDialogProps {
    point: AdminPoint;
    onRegistered: (pickup: AdminPickup) => void;
    onClose: () => void;
}

interface Errors {
    kg?: string | undefined;
    day?: string | undefined;
}

export function PickupDialog({ point, onRegistered, onClose }: PickupDialogProps) {
    const toast = useToast();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const today = todayInBrazil();
    const recent = usePointPickups(point.id);
    const create = useCreatePickup();
    const remove = useDeletePickup();
    const [kg, setKg] = useState('');
    const [day, setDay] = useState(today);
    const [errors, setErrors] = useState<Errors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [removing, setRemoving] = useState<AdminPickup | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    function submit(event: FormEvent) {
        event.preventDefault();
        const parsed = parseKg(kg);
        const next: Errors = {
            ...(parsed === null ? { kg: 'Informe o peso em kg, como 12,5.' } : {}),
            ...(!day || day > today ? { day: 'Escolha hoje ou uma data anterior.' } : {}),
        };
        setErrors(next);
        setFormError(null);
        if (parsed === null || next.day) return;

        create.mutate(
            { pointId: point.id, kg: parsed, pickedUpOn: day },
            {
                onSuccess: (pickup) => {
                    onRegistered(pickup);
                    onClose();
                },
                onError: (error) =>
                    setFormError(
                        error instanceof ApiError
                            ? error.message
                            : 'Não foi possível registrar agora. Tente de novo.',
                    ),
            },
        );
    }

    return (
        <>
            <dialog
                ref={dialogRef}
                className={styles['pickupDialog']}
                aria-labelledby={titleId}
                onCancel={(event) => {
                    event.preventDefault();
                    onClose();
                }}
                onClick={(event) => {
                    if (event.target === dialogRef.current) onClose();
                }}
            >
                <form onSubmit={submit} noValidate>
                    <h2 id={titleId}>Registrar retirada</h2>
                    <p className={styles['muted']}>{point.name}</p>
                    {formError ? (
                        <p className={styles['alert']} role="alert">
                            {formError}
                        </p>
                    ) : null}
                    <div className={styles['pickupFields']}>
                        <AdminInput
                            label="Peso recolhido (kg)"
                            inputMode="decimal"
                            placeholder="12,5"
                            value={kg}
                            error={errors.kg}
                            onChange={(event) => setKg(event.target.value)}
                        />
                        <AdminInput
                            label="Data da retirada"
                            type="date"
                            max={today}
                            value={day}
                            error={errors.day}
                            onChange={(event) => setDay(event.target.value)}
                        />
                    </div>
                    <div className={styles['actions']}>
                        <button
                            type="button"
                            className={`${styles['btn']} ${styles['ghost']}`}
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button type="submit" className={styles['btn']} disabled={create.isPending}>
                            <Icon name="check" /> Registrar retirada
                        </button>
                    </div>
                </form>

                <section className={styles['pickupHistory']} aria-label="Últimas retiradas">
                    <h3>Últimas retiradas</h3>
                    {recent.isPending ? <p className={styles['muted']}>Carregando...</p> : null}
                    {recent.isError ? (
                        <p className={styles['muted']}>Não foi possível carregar o histórico.</p>
                    ) : null}
                    {recent.data && recent.data.length === 0 ? (
                        <p className={styles['muted']}>Nenhuma retirada registrada ainda.</p>
                    ) : null}
                    {recent.data && recent.data.length > 0 ? (
                        <ul className={styles['pickupRows']}>
                            {recent.data.map((item) => (
                                <li key={item.id}>
                                    <span>{formatDay(item.pickedUpOn)}</span>
                                    <b>{formatKg(item.kg)}</b>
                                    <button
                                        type="button"
                                        className={styles['pickupDelete']}
                                        aria-label={`Apagar a retirada de ${formatDay(item.pickedUpOn)}`}
                                        onClick={() => setRemoving(item)}
                                    >
                                        <Icon name="trash" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </section>
            </dialog>

            {removing ? (
                <ConfirmDialog
                    title="Apagar esta retirada?"
                    message={`${formatKg(removing.kg)} de ${formatDay(removing.pickedUpOn)} saem do placar e do certificado deste ponto.`}
                    confirmLabel="Apagar retirada"
                    pending={remove.isPending}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => {
                        remove.mutate(removing.id, {
                            onSuccess: () => toast('Retirada apagada.'),
                            onError: () => toast('Não foi possível apagar a retirada.'),
                        });
                        setRemoving(null);
                    }}
                />
            ) : null}
        </>
    );
}
