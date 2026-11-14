import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PawPrint } from '../components/decor/PawPrint';
import { Icon } from '../components/icon/Icon';
import type { IconName } from '../components/icon/icon-data';
import { SiteImage } from '../components/site-image/SiteImage';
import { ThemeToggle } from '../features/theme/ThemeToggle';
import { useSidebarCollapsed } from './use-sidebar';
import { useDashboard, useLogout, useSession } from '../services/api/admin';
import styles from './admin.module.css';
import { ToastProvider } from './components/Toast';

interface NavEntry {
    to: string;
    label: string;
    icon: IconName;
    end?: boolean;
    adminOnly?: boolean;
}

const NAV: { group: string; items: NavEntry[] }[] = [
    { group: 'Geral', items: [{ to: '/admin', label: 'Visão geral', icon: 'dash', end: true }] },
    {
        group: 'Conteúdo do site',
        items: [
            { to: '/admin/pontos', label: 'Pontos de coleta', icon: 'pin' },
            { to: '/admin/retiradas', label: 'Retiradas e placar', icon: 'truck' },
            { to: '/admin/solicitacoes', label: 'Solicitações', icon: 'inbox' },
            { to: '/admin/contas', label: 'Prestação de contas', icon: 'chart' },
            { to: '/admin/historias', label: 'Histórias', icon: 'file' },
        ],
    },
    {
        group: 'Administração',
        items: [
            {
                to: '/admin/visibilidade',
                label: 'Páginas e seções',
                icon: 'eye',
                adminOnly: true,
            },
            { to: '/admin/equipe', label: 'Equipe e ajustes', icon: 'lock', adminOnly: true },
        ],
    },
];

const TITLES: Record<string, string> = {
    '/admin': 'Visão geral',
    '/admin/pontos': 'Pontos de coleta',
    '/admin/retiradas': 'Retiradas e placar',
    '/admin/solicitacoes': 'Solicitações',
    '/admin/contas': 'Prestação de contas',
    '/admin/historias': 'Histórias',
    '/admin/visibilidade': 'Páginas e seções',
    '/admin/equipe': 'Equipe e ajustes',
};

const ROLE_LABEL = { ADMIN: 'Administrador', EDITOR: 'Editor' } as const;

export function AdminLayout() {
    const user = useSession().data;
    const dashboard = useDashboard();
    const logout = useLogout();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const title = TITLES[pathname.replace(/\/$/, '')] ?? 'Painel';
    const [collapsed, toggleCollapsed] = useSidebarCollapsed();

    if (!user) return null;
    const newRequests = dashboard.data?.newHelpRequests ?? 0;

    return (
        <ToastProvider>
            <div className={`${styles['adm']} ${collapsed ? styles['admCollapsed'] : ''}`}>
                <aside className={styles['side']}>
                    <PawPrint className={styles['sidePaw']} />
                    <div className={styles['brand']}>
                        <SiteImage file="logo-real.jpg" alt="" width={36} height={36} />
                        <div className={styles['brandText']}>
                            <b>Patinhas Carentes</b>
                            <span>Painel do site</span>
                        </div>
                        <button
                            type="button"
                            className={styles['collapseBtn']}
                            aria-label={collapsed ? 'Expandir o menu' : 'Recolher o menu'}
                            aria-expanded={!collapsed}
                            title={collapsed ? 'Expandir o menu' : 'Recolher o menu'}
                            onClick={toggleCollapsed}
                        >
                            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} />
                        </button>
                    </div>
                    <nav className={styles['nav']} aria-label="Painel">
                        {NAV.map((section) => {
                            const items = section.items.filter(
                                (item) => !item.adminOnly || user.role === 'ADMIN',
                            );
                            if (items.length === 0) return null;
                            return (
                                <div key={section.group} className={styles['navSection']}>
                                    <p className={styles['group']}>{section.group}</p>
                                    {items.map((item) => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            end={item.end ?? false}
                                            title={item.label}
                                        >
                                            <Icon name={item.icon} />
                                            <span className={styles['navLabel']}>{item.label}</span>
                                            {item.to === '/admin/solicitacoes' &&
                                            newRequests > 0 ? (
                                                <span
                                                    className={styles['badge']}
                                                    aria-label={`${newRequests} novas`}
                                                >
                                                    {newRequests}
                                                </span>
                                            ) : null}
                                        </NavLink>
                                    ))}
                                </div>
                            );
                        })}
                    </nav>
                    <div className={styles['user']}>
                        <div className={styles['avatar']} aria-hidden="true">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles['who']}>
                            <b>{user.name}</b>
                            <span>{ROLE_LABEL[user.role]}</span>
                        </div>
                        <button
                            className={styles['iconBtn']}
                            type="button"
                            title="Sair"
                            aria-label="Sair"
                            onClick={() =>
                                logout.mutate(undefined, {
                                    onSettled: () => navigate('/admin/login'),
                                })
                            }
                        >
                            <Icon name="logout" />
                        </button>
                    </div>
                </aside>
                <div className={styles['main']}>
                    <header className={styles['top']}>
                        <h1>{title}</h1>
                        <div className={styles['topActions']}>
                            <ThemeToggle />
                            <a
                                className={`${styles['btn']} ${styles['ghost']}`}
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Icon name="ext" /> Ver o site
                            </a>
                        </div>
                    </header>
                    <main className={styles['body']}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </ToastProvider>
    );
}
