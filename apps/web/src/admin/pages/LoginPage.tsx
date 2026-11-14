import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { SiteImage } from '../../components/site-image/SiteImage';
import { ThemeToggle } from '../../features/theme/ThemeToggle';
import { useDocumentTitle } from '../../lib/use-document-title';
import { ApiError } from '../../services/api/client';
import { useLogin, useSession } from '../../services/api/admin';
import styles from '../admin.module.css';

export function LoginPage() {
    useDocumentTitle('Área da equipe | Patinhas Carentes Joinville');
    const session = useSession();
    const login = useLogin();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const from = (location.state as { from?: string } | null)?.from;
    const target = from && from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin';

    if (session.data) return <Navigate to={target} replace />;

    function submit(event: FormEvent) {
        event.preventDefault();
        login.mutate(
            { email: email.trim(), password },
            { onSuccess: () => navigate(target, { replace: true }) },
        );
    }

    const error = login.error;
    const message =
        error instanceof ApiError && error.status === 429
            ? 'Muitas tentativas. Espere um minuto e tente de novo.'
            : error instanceof ApiError && error.status === 401
              ? 'E-mail ou senha incorretos.'
              : error
                ? 'Não foi possível entrar agora. Tente de novo.'
                : null;

    return (
        <div className={styles['loginPage']}>
            <div className={styles['loginTheme']}>
                <ThemeToggle />
            </div>
            <form className={styles['loginCard']} onSubmit={submit}>
                <div className={styles['loginLogo']}>
                    <SiteImage file="logo-real.jpg" alt="" width={44} height={44} />
                    <span>Patinhas Carentes</span>
                </div>
                <h1>Área da equipe</h1>
                <p>
                    Entre para atualizar pontos de coleta, responder pedidos e publicar a prestação
                    de contas.
                </p>
                {message ? (
                    <p className={styles['alert']} role="alert">
                        {message}
                    </p>
                ) : null}
                <div className={styles['fld']}>
                    <label htmlFor="login-email">E-mail</label>
                    <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className={styles['fld']}>
                    <label htmlFor="login-password">Senha</label>
                    <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button className={styles['btn']} type="submit" disabled={login.isPending}>
                    {login.isPending ? 'Entrando...' : 'Entrar no painel'}
                </button>
                <p className={styles['loginBack']}>
                    <Link to="/">← Voltar para o site</Link>
                </p>
            </form>
        </div>
    );
}
