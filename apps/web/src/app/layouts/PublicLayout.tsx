import { formatBrazilianPhone, formatCnpj, instagramUrl, whatsappUrl } from '@patinhas/shared';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Icon } from '../../components/icon/Icon';
import { buttonClass } from '../../components/button/Button';
import { SiteImage } from '../../components/site-image/SiteImage';
import { DEFAULT_INSTAGRAM, DEFAULT_WHATSAPP, FOOTER_LINKS, MAIN_NAV } from '../../content/site';
import { Feature } from '../../features/site-features/Feature';
import { useSiteFeatures } from '../../features/site-features/useSiteFeatures';
import { ThemeSelector } from '../../features/theme/ThemeSelector';
import { ThemeToggle } from '../../features/theme/ThemeToggle';
import { useSiteSettings } from '../../services/api/public';
import { ScrollManager } from '../ScrollManager';
import styles from './public-layout.module.css';

export function PublicLayout() {
    const settings = useSiteSettings();
    const whatsapp = settings.data?.whatsappNumber ?? DEFAULT_WHATSAPP;
    const instagram = settings.data?.instagramHandle ?? DEFAULT_INSTAGRAM;
    const { isVisible } = useSiteFeatures();
    const navItems = MAIN_NAV.filter((item) => !item.feature || isVisible(item.feature));
    const footerLinks = FOOTER_LINKS.filter((link) => !link.feature || isVisible(link.feature));

    return (
        <div className={styles['site']}>
            <ScrollManager />
            <a className={styles['skip']} href="#conteudo">
                Ir para o conteúdo
            </a>

            <header className={styles['header']}>
                <Link className={styles['brand']} to="/">
                    <SiteImage file="logo-real.jpg" alt="" width={38} height={38} loading="eager" />
                    <span>
                        <b>Patinhas Carentes</b>
                        <small>Joinville</small>
                    </span>
                </Link>

                <nav className={styles['nav']} aria-label="Menu principal">
                    <div className={styles['navInner']}>
                        {navItems.map((item) => {
                            const label = (
                                <>
                                    <span className={styles['short']}>{item.short}</span>
                                    <span className={styles['long']}>{item.long}</span>
                                </>
                            );
                            return item.hash ? (
                                <Link
                                    key={item.long}
                                    className={`${styles['link']} ${styles['navDonate']}`}
                                    to={{ pathname: item.to, hash: item.hash }}
                                >
                                    {label}
                                </Link>
                            ) : (
                                <NavLink
                                    key={item.long}
                                    to={item.to}
                                    end={item.end ?? false}
                                    className={({ isActive }) =>
                                        [
                                            styles['link'],
                                            isActive ? styles['here'] : '',
                                            item.end ? styles['navHome'] : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')
                                    }
                                >
                                    {label}
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>

                <div className={styles['tools']}>
                    <ThemeToggle />
                    <Link className={styles['staff']} to="/admin/login">
                        <Icon name="lock" className={styles['smallIcon']} />
                        <span className={styles['long']}>Área da equipe</span>
                        <span className={styles['short']}>Entrar</span>
                    </Link>
                    <Feature name="home.points">
                        <Link
                            className={buttonClass({
                                variant: 'sun',
                                size: 'sm',
                                className: styles['cta'],
                            })}
                            to={{ pathname: '/', hash: '#achar' }}
                        >
                            <Icon name="cap" /> Doar tampinhas
                        </Link>
                    </Feature>
                </div>
            </header>

            <main id="conteudo" tabIndex={-1}>
                <Outlet />
            </main>

            <footer className={styles['footer']}>
                <div className={styles['footerGrid']}>
                    <div>
                        <h3>Patinhas Carentes Joinville</h3>
                        <p>
                            Instituição sem fins lucrativos dedicada à causa animal. Sustentada pela
                            arrecadação de tampinhas plásticas em Joinville e região.
                        </p>
                    </div>
                    <div>
                        <h3>Navegue</h3>
                        <ul>
                            <Feature name="home.points">
                                <li>
                                    <Link to={{ pathname: '/', hash: '#achar' }}>
                                        Doar tampinhas
                                    </Link>
                                </li>
                            </Feature>
                            {footerLinks.map((link) => (
                                <li key={link.to}>
                                    <Link to={link.to}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3>Fale com a gente</h3>
                        <p>
                            WhatsApp:{' '}
                            <a
                                href={whatsappUrl(whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {formatBrazilianPhone(whatsapp)}
                            </a>
                        </p>
                        <p>
                            Instagram:{' '}
                            <a
                                href={instagramUrl(instagram)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                @{instagram}
                            </a>
                        </p>
                        <div className={styles['appearance']}>
                            <h3>Aparência</h3>
                            <ThemeSelector />
                        </div>
                    </div>
                </div>
                <p className={styles['tiny']}>
                    Patinhas Carentes Joinville. Instituição sem fins lucrativos.
                    {settings.data?.cnpj
                        ? ' CNPJ ' + formatCnpj(settings.data.cnpj) + '.'
                        : null}{' '}
                    <Link className={styles['staffFooter']} to="/admin/login">
                        Área da equipe
                    </Link>
                </p>
            </footer>

            <Feature name="global.whatsapp">
                <div className={styles['fabWrap']}>
                    <a
                        className={styles['fab']}
                        href={whatsappUrl(whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Falar no WhatsApp"
                    >
                        <Icon name="wa" />
                        <span>WhatsApp</span>
                    </a>
                </div>
            </Feature>
        </div>
    );
}
