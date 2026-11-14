import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../services/api/client';
import { useSaveSettings } from '../../services/api/admin';
import type { AdminSettings } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import type { SettingField } from '../settings-fields';
import { AdminInput } from './AdminField';
import { useToast } from './Toast';

const SAVED_FLASH_MS = 2500;

interface SettingRowProps {
    field: SettingField;
    data: AdminSettings;
}

export function SettingRow({ field, data }: SettingRowProps) {
    const toast = useToast();
    const save = useSaveSettings();
    const saved = field.format(data);
    const [draft, setDraft] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedFlash, setSavedFlash] = useState(false);
    const value = draft ?? saved;
    const dirty = value !== saved;
    const hint = typeof field.hint === 'function' ? field.hint(data) : field.hint;

    useEffect(() => {
        if (!savedFlash) return undefined;
        const timer = window.setTimeout(() => {
            setSavedFlash(false);
        }, SAVED_FLASH_MS);
        return () => {
            window.clearTimeout(timer);
        };
    }, [savedFlash]);

    function discard() {
        setDraft(null);
        setError(null);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        if (!dirty) return;
        const parsed = field.parse(value);
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }
        setError(null);
        save.mutate(parsed.payload, {
            onSuccess: () => {
                setDraft(null);
                setSavedFlash(true);
                toast(`${field.label}: salvo.`);
            },
            onError: (cause) =>
                setError(
                    cause instanceof ApiError && cause.status === 400
                        ? 'O servidor não aceitou esse valor. Confira e tente de novo.'
                        : 'Não foi possível salvar agora.',
                ),
        });
    }

    return (
        <form className={styles['settingRow']} onSubmit={submit} noValidate>
            <AdminInput
                label={field.label}
                value={value}
                onChange={(event) => {
                    setDraft(event.target.value);
                    setError(null);
                }}
                hint={hint}
                error={error ?? undefined}
                {...(field.inputMode ? { inputMode: field.inputMode } : {})}
                {...(field.placeholder ? { placeholder: field.placeholder } : {})}
            />
            <div className={styles['settingAction']}>
                {dirty ? (
                    <>
                        <button
                            className={`${styles['btn']} ${styles['sm']}`}
                            type="submit"
                            disabled={save.isPending}
                        >
                            {save.isPending ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                            className={styles['link']}
                            type="button"
                            disabled={save.isPending}
                            onClick={discard}
                        >
                            Desfazer
                        </button>
                    </>
                ) : savedFlash ? (
                    <span className={styles['settingSaved']}>Salvo</span>
                ) : null}
            </div>
        </form>
    );
}
