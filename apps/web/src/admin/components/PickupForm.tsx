import { useMemo, useState, type FormEvent } from 'react';
import { estimateKgFromBags } from '@patinhas/shared';
import { Icon } from '../../components/icon/Icon';
import { todayInBrazil } from '../../lib/format';
import { ApiError } from '../../services/api/client';
import { useCreatePickup } from '../../services/api/admin';
import { useSiteSettings } from '../../services/api/public';
import type { AdminPickup, AdminPoint } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { parseKg } from '../pickup-input';
import { AdminInput } from './AdminField';
import { SearchSelect } from './SearchSelect';

interface PickupFormProps {
    points: AdminPoint[];
    onRegistered: (pickup: AdminPickup) => void;
}

interface Errors {
    point?: string | undefined;
    kg?: string | undefined;
    bags?: string | undefined;
    day?: string | undefined;
}

export function PickupForm({ points, onRegistered }: PickupFormProps) {
    const create = useCreatePickup();
    const today = todayInBrazil();
    const [pointId, setPointId] = useState('');
    const settings = useSiteSettings();
    const kgPer100L = settings.data?.kgPer100LBag ?? 8;
    const [mode, setMode] = useState<'kg' | 'bags'>('kg');
    const [kg, setKg] = useState('');
    const [bags, setBags] = useState('');
    const [bagLiters, setBagLiters] = useState('100');
    const bagCount = Number.parseInt(bags, 10);
    const liters = Number.parseInt(bagLiters, 10);
    const bagsValid = bagCount > 0 && liters > 0;
    const estimate = bagsValid ? estimateKgFromBags(bagCount, liters, kgPer100L) : null;
    const [day, setDay] = useState(today);
    const [errors, setErrors] = useState<Errors>({});
    const [formError, setFormError] = useState<string | null>(null);

    const options = useMemo(
        () =>
            points.map((point) => ({
                value: point.id,
                label: point.name,
                detail: point.neighborhood,
            })),
        [points],
    );

    function submit(event: FormEvent) {
        event.preventDefault();
        const parsed = mode === 'kg' ? parseKg(kg) : 0;
        const next: Errors = {
            ...(pointId === '' ? { point: 'Escolha o ponto de coleta.' } : {}),
            ...(mode === 'kg' && parsed === null ? { kg: 'Informe o peso em kg, como 12,5.' } : {}),
            ...(mode === 'bags' && !bagsValid
                ? { bags: 'Informe a quantidade de sacos e o tamanho em litros.' }
                : {}),
            ...(!day || day > today ? { day: 'Escolha hoje ou uma data anterior.' } : {}),
        };
        setErrors(next);
        setFormError(null);
        if (pointId === '' || parsed === null || (mode === 'bags' && !bagsValid) || next.day) return;

        create.mutate(
            mode === 'kg'
                ? { pointId, kg: parsed, pickedUpOn: day }
                : { pointId, bags: bagCount, bagLiters: liters, pickedUpOn: day },
            {
                onSuccess: (pickup) => {
                    onRegistered(pickup);
                    setKg('');
                    setBags('');
                    setPointId('');
                    setDay(today);
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
        <form className={styles['card']} onSubmit={submit} noValidate>
            <div className={styles['cardHead']}>
                <h2>Registrar uma retirada</h2>
            </div>
            <p className={`${styles['muted']} ${styles['gapBottom12']}`}>
                Use quando a equipe buscar as tampinhas em um ponto. O peso entra no placar e no
                certificado desse ponto.
            </p>
            {formError ? (
                <p className={styles['alert']} role="alert">
                    {formError}
                </p>
            ) : null}
            <div className={`${styles['fgrid']} ${styles['one']}`}>
                <SearchSelect
                    label="Ponto de coleta"
                    options={options}
                    value={pointId}
                    onChange={setPointId}
                    placeholder="Digite o nome ou o bairro do ponto"
                    noResults="Nenhum ponto com esse nome ou bairro."
                    error={errors.point}
                />
                <div className={styles.modeToggle} role="group" aria-label="Como informar a quantidade">
                    <label>
                        <input
                            type="radio"
                            name="pickup-mode"
                            checked={mode === 'kg'}
                            onChange={() => setMode('kg')}
                        />
                        Pesei (kg)
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="pickup-mode"
                            checked={mode === 'bags'}
                            onChange={() => setMode('bags')}
                        />
                        Contei sacos
                    </label>
                </div>
                {mode === 'kg' ? (
                    <AdminInput
                        label="Peso recolhido (kg)"
                        inputMode="decimal"
                        placeholder="12,5"
                        value={kg}
                        error={errors.kg}
                        onChange={(event) => setKg(event.target.value)}
                    />
                ) : (
                    <>
                        <AdminInput
                            label="Quantidade de sacos"
                            inputMode="numeric"
                            placeholder="3"
                            value={bags}
                            error={errors.bags}
                            onChange={(event) => setBags(event.target.value)}
                        />
                        <AdminInput
                            label="Tamanho do saco (litros)"
                            inputMode="numeric"
                            placeholder="100"
                            value={bagLiters}
                            onChange={(event) => setBagLiters(event.target.value)}
                        />
                        <p className={styles['muted']}>
                            {estimate === null
                                ? `Estimativa: ${kgPer100L} kg por saco de 100 L.`
                                : `Estimativa: cerca de ${estimate.toLocaleString('pt-BR')} kg (${kgPer100L} kg por saco de 100 L).`}
                        </p>
                    </>
                )}
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
                <button type="submit" className={styles['btn']} disabled={create.isPending}>
                    <Icon name="check" /> Registrar retirada
                </button>
            </div>
        </form>
    );
}
