import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { StateMessage } from '../../components/state-message/StateMessage';
import { useDocumentTitle } from '../../lib/use-document-title';
import { ApiError } from '../../services/api/client';
import {
    useAdminSettings,
    useAdminUsers,
    useCreateUser,
    useSession,
    useUpdateUser,
} from '../../services/api/admin';
import type { AdminSettings, Role } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { AdminInput, AdminSelect } from '../components/AdminField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SettingRow } from '../components/SettingRow';
import { useToast } from '../components/Toast';
import { SETTING_GROUPS } from '../settings-fields';

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administrador', EDITOR: 'Editor' };
const MIN_PASSWORD = 10;

export function TeamPage() {
    useDocumentTitle('Equipe e ajustes | Painel Patinhas');
    const session = useSession().data;
    if (session && session.role !== 'ADMIN') return <Navigate to="/admin" replace />;
    return (
        <>
            <SettingsCard />
            <UsersCard currentUserId={session?.id ?? ''} />
        </>
    );
}

function SettingsCard() {
    const settings = useAdminSettings();
    if (settings.isPending)
        return <StateMessage kind="loading">Carregando os ajustes...</StateMessage>;
    if (settings.isError) {
        return (
            <StateMessage kind="error" onRetry={() => void settings.refetch()}>
                Não foi possível carregar os ajustes.
            </StateMessage>
        );
    }
    return <SettingsPanel data={settings.data} />;
}

function SettingsPanel({ data }: { data: AdminSettings }) {
    return (
        <div className={styles['card']}>
            <div className={styles['cardHead']}>
                <h2>Ajustes do site</h2>
            </div>
            <p className={styles['muted']}>
                Cada campo salva sozinho. Altere só o que precisar e use o botão Salvar ao lado
                dele.
            </p>
            {SETTING_GROUPS.map((group) => (
                <section key={group.title} className={styles['settingGroup']}>
                    <h3>{group.title}</h3>
                    <p className={styles['muted']}>{group.description}</p>
                    {group.fields.map((field) => (
                        <SettingRow key={field.id} field={field} data={data} />
                    ))}
                </section>
            ))}
        </div>
    );
}

function UsersCard({ currentUserId }: { currentUserId: string }) {
    const toast = useToast();
    const users = useAdminUsers();
    const create = useCreateUser();
    const update = useUpdateUser();
    const [deactivating, setDeactivating] = useState<{ id: string; name: string } | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('EDITOR');
    const [error, setError] = useState<string | null>(null);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (!name.trim() || !email.includes('@')) {
            setError('Escreva o nome e um e-mail válido.');
            return;
        }
        if (password.length < MIN_PASSWORD) {
            setError(`A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`);
            return;
        }
        setError(null);
        create.mutate(
            { name: name.trim(), email: email.trim(), password, role },
            {
                onSuccess: () => {
                    toast('Pessoa cadastrada.');
                    setName('');
                    setEmail('');
                    setPassword('');
                    setRole('EDITOR');
                },
                onError: (e) =>
                    setError(
                        e instanceof ApiError && e.status === 409
                            ? 'Esse e-mail já está cadastrado.'
                            : 'Não foi possível cadastrar.',
                    ),
            },
        );
    }

    return (
        <div className={styles['cols']}>
            <form className={styles['card']} onSubmit={submit} noValidate>
                <div className={styles['cardHead']}>
                    <h2>Cadastrar pessoa da equipe</h2>
                </div>
                {error ? (
                    <p className={styles['alert']} role="alert">
                        {error}
                    </p>
                ) : null}
                <div className={`${styles['fgrid']} ${styles['one']}`}>
                    <AdminInput
                        label="Nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <AdminInput
                        label="E-mail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <AdminInput
                        label="Senha inicial"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        hint={`Mínimo de ${MIN_PASSWORD} caracteres. Passe a senha em mãos ou por mensagem privada.`}
                    />
                    <AdminSelect
                        label="Permissão"
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                        hint="Editor cuida do conteúdo. Administrador também gerencia a equipe e os ajustes."
                    >
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Administrador</option>
                    </AdminSelect>
                </div>
                <div className={styles['actions']}>
                    <button className={styles['btn']} type="submit" disabled={create.isPending}>
                        {create.isPending ? 'Cadastrando...' : 'Cadastrar'}
                    </button>
                </div>
            </form>

            <div className={styles['card']}>
                <div className={styles['cardHead']}>
                    <h2>Equipe</h2>
                </div>
                {users.isPending ? <StateMessage kind="loading">Carregando...</StateMessage> : null}
                {users.isError ? (
                    <StateMessage kind="error" onRetry={() => void users.refetch()}>
                        Não foi possível carregar a equipe.
                    </StateMessage>
                ) : null}
                {users.data ? (
                    <ul className={styles['list']}>
                        {users.data.map((user) => (
                            <li key={user.id}>
                                <div>
                                    <b>{user.name}</b>
                                    <span>
                                        {user.email} · {ROLE_LABEL[user.role]}
                                        {user.isActive ? '' : ' · desativado'}
                                    </span>
                                </div>
                                {user.id === currentUserId ? (
                                    <span>você</span>
                                ) : (
                                    <button
                                        className={`${styles['link']} ${user.isActive ? styles['danger'] : ''}`}
                                        type="button"
                                        disabled={update.isPending}
                                        onClick={() => {
                                            if (user.isActive) {
                                                setDeactivating({ id: user.id, name: user.name });
                                                return;
                                            }
                                            update.mutate(
                                                { id: user.id, isActive: true },
                                                {
                                                    onSuccess: () => toast('Acesso reativado.'),
                                                    onError: () =>
                                                        toast('Não foi possível alterar.'),
                                                },
                                            );
                                        }}
                                    >
                                        {user.isActive ? 'Desativar' : 'Reativar'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
            {deactivating ? (
                <ConfirmDialog
                    title="Desativar este acesso?"
                    message={`${deactivating.name} não vai mais conseguir entrar no painel. Você pode reativar quando quiser.`}
                    confirmLabel="Desativar acesso"
                    pending={update.isPending}
                    onCancel={() => setDeactivating(null)}
                    onConfirm={() => {
                        update.mutate(
                            { id: deactivating.id, isActive: false },
                            {
                                onSuccess: () => toast('Acesso desativado.'),
                                onError: () => toast('Não foi possível alterar.'),
                            },
                        );
                        setDeactivating(null);
                    }}
                />
            ) : null}
        </div>
    );
}
