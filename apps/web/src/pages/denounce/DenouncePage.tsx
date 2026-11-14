import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { PawPrint } from '../../components/decor/PawPrint';
import { Icon } from '../../components/icon/Icon';
import { PageHero } from '../../components/page-hero/PageHero';
import { useDocumentTitle } from '../../lib/use-document-title';
import { Feature } from '../../features/site-features/Feature';
import pageStyles from '../shared/page.module.css';
import styles from './denounce.module.css';

const PORTAL = 'https://ouvidoria-form.joinville.sc.gov.br/';
const STEPS = [
    ['Abra o portal e escolha Denúncia', 'Use o cartão do portal, logo acima.'],
    ['Preencha as informações', 'A ouvidoria é anônima. Seus dados não são divulgados.'],
    ['Mande fotos ou vídeos', 'Sempre que puder. Eles fortalecem a denúncia.'],
] as const;

export function DenouncePage() {
    useDocumentTitle('Denunciar maus-tratos | Patinhas Carentes Joinville');
    return (
        <>
            <PageHero kicker="Maus-tratos" title="Não se cale. Denuncie.">
                Escolha o jeito mais rápido para você.
            </PageHero>

            <section className={styles['options']} aria-label="Formas de denunciar">
                <a className={`${styles['option']} ${styles['urgent']}`} href="tel:190">
                    <span className={styles['flag']}>Está acontecendo agora?</span>
                    <span className={styles['icon']}>
                        <Icon name="phone" />
                    </span>
                    <b className={styles['number']}>190</b>
                    <span className={styles['label']}>
                        Polícia Militar, se estiver acontecendo agora
                    </span>
                    <span className={styles['go']}>
                        Ligar agora <Icon name="go" />
                    </span>
                </a>

                <a className={`${styles['option']} ${styles['phone']}`} href="tel:181">
                    <span className={styles['flag']}>Para fazer a denúncia</span>
                    <span className={styles['icon']}>
                        <Icon name="phone" />
                    </span>
                    <b className={styles['number']}>181</b>
                    <span className={styles['label']}>Polícia Civil, para fazer a denúncia</span>
                    <span className={styles['go']}>
                        Ligar agora <Icon name="go" />
                    </span>
                </a>

                <a
                    className={`${styles['option']} ${styles['portal']}`}
                    href={PORTAL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span className={styles['flag']}>Online e anônima</span>
                    <span className={styles['icon']}>
                        <Icon name="ext" />
                    </span>
                    <b className={styles['number']}>Portal</b>
                    <span className={styles['label']}>Denunciar pelo portal da prefeitura</span>
                    <span className={styles['go']}>
                        Abrir o portal <Icon name="go" />
                    </span>
                </a>
            </section>

            <section className={styles['how']} aria-labelledby="portal-steps">
                <PawPrint className={styles['howPaw']} />
                <p className={styles['kicker']}>Passo a passo</p>
                <h2 id="portal-steps">Pelo portal, em 3 passos</h2>
                <ol className={styles['steps']}>
                    {STEPS.map(([title, text], index) => (
                        <li key={title} className={styles['step']}>
                            <span className={styles['stepNum']}>{index + 1}</span>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </li>
                    ))}
                </ol>
                <div className={styles['after']}>
                    <Icon name="alert" />
                    <p>Depois de enviar, acompanhe. Se não for resolvido, ligue para o 181.</p>
                </div>
            </section>

            <Feature name="page.help">
                <div className={pageStyles['cta']}>
                    <h2>Quer ajudar os animais resgatados?</h2>
                    <p>
                        Doe tampinhas ou receba um bichinho em casa até ele encontrar uma família.
                    </p>
                    <Link className={buttonClass({ variant: 'sun', size: 'xl' })} to="/como-ajudar">
                        Ver como ajudar
                    </Link>
                </div>
            </Feature>
        </>
    );
}
