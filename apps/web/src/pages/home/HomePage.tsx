import { instagramUrl } from '@patinhas/shared';
import { Link } from 'react-router-dom';
import { PawPrint } from '../../components/decor/PawPrint';
import { Icon } from '../../components/icon/Icon';
import { SiteImage } from '../../components/site-image/SiteImage';
import { buttonClass } from '../../components/button/Button';
import { HELP_CARDS, HOW_STEPS } from '../../content/home';
import { DEFAULT_INSTAGRAM } from '../../content/site';
import { CollectChecker } from '../../features/collect-checker/CollectChecker';
import { ImpactMeter } from '../../features/impact-meter/ImpactMeter';
import { PointFinder } from '../../features/point-finder/PointFinder';
import { Feature } from '../../features/site-features/Feature';
import { useSiteFeatures } from '../../features/site-features/useSiteFeatures';
import { useSiteSettings } from '../../services/api/public';
import { DEFAULT_IMPACT_SETTINGS } from '../../content/defaults';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './home.module.css';

const paw = (...names: string[]) =>
    [styles['paw'], ...names.map((name) => styles[name])].filter(Boolean).join(' ');

export function HomePage() {
    useDocumentTitle('Patinhas Carentes Joinville | Doe tampinhas e ajude cães e gatos');
    const settings = useSiteSettings();
    const data = settings.data;
    const instagram = data?.instagramHandle ?? DEFAULT_INSTAGRAM;
    const { isVisible } = useSiteFeatures();
    const cards = HELP_CARDS.filter((card) => isVisible(card.feature));

    return (
        <>
            <section className={styles['hero']}>
                <PawPrint className={paw('heroPawA')} />
                <PawPrint className={paw('heroPawB')} />
                <div className={styles['heroGrid']}>
                    <div className={styles['heroIn']}>
                        <p className={styles['kickerOnDark']}>
                            ONG sem fins lucrativos em Joinville
                        </p>
                        <h1>Cada tampinha dá a um bichinho uma segunda chance.</h1>
                        <p>
                            Não temos abrigo. Uma rede de protetores e lares temporários cuida de
                            cães e gatos resgatados, e as tampinhas que você junta pagam ração,
                            vacina e castração.
                        </p>
                        <div className={styles['heroButtons']}>
                            <Feature name="home.points">
                                <Link
                                    className={buttonClass({ variant: 'sun' })}
                                    to={{ pathname: '/', hash: '#achar' }}
                                >
                                    <Icon name="pin" /> Achar o ponto de coleta
                                </Link>
                            </Feature>
                            <Feature name="page.help">
                                <Link
                                    className={buttonClass({ variant: 'ghost' })}
                                    to="/como-ajudar"
                                >
                                    Quero ser lar temporário
                                </Link>
                            </Feature>
                        </div>
                    </div>
                    <div className={styles['heroArt']}>
                        <div className={styles['photoFrame']}>
                            <SiteImage
                                file="ig-post2.jpg"
                                alt="Cachorro resgatado ao lado de um pote de ração"
                                width={480}
                                height={640}
                                loading="eager"
                            />
                        </div>
                        <span className={styles['sticker']}>
                            <PawPrint className={styles['stickerPaw']} /> Cada tampinha conta
                        </span>
                    </div>
                </div>
            </section>

            <Feature name="home.stats">
                {data ? (
                    <section className={styles['stats']} aria-label="A campanha em números">
                        <Feature name="home.points">
                            <div>
                                <b>{data.collectionPointCount.toLocaleString('pt-BR')}</b>
                                <span>pontos de coleta</span>
                            </div>
                        </Feature>
                        {data.monthlyAverageKg > 0 ? (
                            <div>
                                <b>{data.monthlyAverageKg.toLocaleString('pt-BR')} kg</b>
                                <span>de tampinhas por mês, em média</span>
                            </div>
                        ) : null}
                        {(data.animalsServedYear ?? 0) > 0 ? (
                            <div>
                                <b>{(data.animalsServedYear ?? 0).toLocaleString('pt-BR')}</b>
                                <span>animais atendidos no ano</span>
                            </div>
                        ) : null}
                    </section>
                ) : null}
            </Feature>

            {cards.length > 0 ? (
                <Feature name="home.paths">
                    <section className={styles['paths']} aria-labelledby="paths-title">
                        <p className={styles['kicker']}>Por onde começar</p>
                        <h2 id="paths-title">O que você quer fazer hoje?</h2>
                        <div className={styles['cards']}>
                            {cards.map((card, index) => (
                                <Link
                                    key={card.title}
                                    className={styles['card']}
                                    to={
                                        card.hash ? { pathname: card.to, hash: card.hash } : card.to
                                    }
                                >
                                    <span className={styles['cardIcon']}>
                                        <Icon name={card.icon} />
                                    </span>
                                    <span className={styles['cardNumber']}>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3>{card.title}</h3>
                                    <p>{card.text}</p>
                                    <span className={styles['more']}>
                                        {card.cta} <Icon name="go" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                </Feature>
            ) : null}

            <Feature name="home.impact">
                <ImpactMeter settings={data ?? DEFAULT_IMPACT_SETTINGS} />
            </Feature>

            <Feature name="home.how">
                <section className={styles['how']} aria-labelledby="how-title">
                    <PawPrint className={paw('howPawA')} />
                    <PawPrint className={paw('howPawB')} />
                    <div className={styles['howIn']}>
                        <p className={styles['kicker']}>Como funciona</p>
                        <h2 id="how-title">Da sua tampinha ao cuidado, em 3 passos</h2>
                        <ol className={styles['steps']}>
                            {HOW_STEPS.map((step, index) => (
                                <li key={step.title} className={styles['step']}>
                                    <div className={styles['stepTop']}>
                                        <span className={styles['stepNum']}>{index + 1}</span>
                                        <span className={styles['stepIcon']}>
                                            <Icon name={step.icon} />
                                        </span>
                                    </div>
                                    <h3>{step.title}</h3>
                                    <p>{step.text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>
            </Feature>

            <Feature name="home.points">
                <PointFinder />
            </Feature>

            <Feature name="home.checker">
                <CollectChecker />
            </Feature>

            <Feature name={['home.callout', 'page.school']}>
                <div className={styles['callout']}>
                    <PawPrint className={paw('calloutPaw')} />
                    <div>
                        <h2>Falta ponto perto de você?</h2>
                        <p>
                            Seu comércio, escola ou condomínio pode ser o próximo ponto de coleta.
                        </p>
                    </div>
                    <Link
                        className={buttonClass({ variant: 'sun', size: 'xl' })}
                        to="/escolas-e-empresas"
                    >
                        Quero abrir um ponto
                    </Link>
                </div>
            </Feature>

            <Feature name="home.about">
                <section className={styles['about']}>
                    <div className={styles['archWrap']}>
                        <div className={styles['arch']}>
                            <SiteImage
                                file="ig-post1.jpg"
                                alt="Cachorro resgatado"
                                width={480}
                                height={640}
                            />
                        </div>
                    </div>
                    <div className={styles['aboutText']}>
                        <p className={styles['kicker']}>Quem somos</p>
                        <h2>Uma ONG dedicada à causa animal, em Joinville.</h2>
                        <p>
                            Nossas principais ações são a compra de ração, castrações, vacinas e
                            atendimento veterinário para animais em situação de vulnerabilidade.
                        </p>
                        <p>
                            Tudo isso é possível com a arrecadação de tampinhas plásticas. Recebemos
                            as doações, enviamos para reciclagem e usamos o valor para sustentar e
                            ampliar as ações.
                        </p>
                        <Feature name="page.report">
                            <Link
                                className={buttonClass({ variant: 'line', size: 'sm' })}
                                to="/prestacao-de-contas"
                            >
                                Ver para onde vai a tampinha
                            </Link>
                        </Feature>
                    </div>
                </section>
            </Feature>

            <Feature name="home.foster">
                <section className={styles['foster']}>
                    <PawPrint className={paw('fosterPawA')} />
                    <PawPrint className={paw('fosterPawB')} />
                    <div className={styles['fosterIn']}>
                        <div className={styles['fosterText']}>
                            <p className={styles['kickerOnDark']}>Nossa maior necessidade</p>
                            <h2>Precisamos de lares temporários.</h2>
                            <p>
                                Muitos animais resgatados precisam de um espaço seguro, com cuidado
                                e paciência, até estarem prontos para adoção.
                            </p>
                            <Feature name="page.help">
                                <Link className={buttonClass({ variant: 'sun' })} to="/como-ajudar">
                                    Quero acolher um bichinho
                                </Link>
                            </Feature>
                        </div>
                        <div className={styles['tilt']}>
                            <SiteImage
                                file="ig-post3.jpg"
                                alt="Filhotes resgatados"
                                width={480}
                                height={640}
                            />
                        </div>
                    </div>
                </section>
            </Feature>

            <Feature name="home.instagram">
                <section className={styles['section']}>
                    <p className={styles['kicker']}>Instagram</p>
                    <h2>Resgates e feirinhas do dia a dia</h2>
                    <div className={styles['strip']}>
                        <SiteImage file="ig-post1.jpg" alt="" width={300} height={400} />
                        <SiteImage file="ig-post2.jpg" alt="" width={300} height={400} />
                        <SiteImage file="ig-post3.jpg" alt="" width={300} height={400} />
                    </div>
                    <a
                        className={buttonClass({ variant: 'line', size: 'sm' })}
                        href={instagramUrl(instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Seguir @{instagram}
                    </a>
                </section>
            </Feature>
        </>
    );
}
