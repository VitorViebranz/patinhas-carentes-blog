import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { PawPrint } from '../../components/decor/PawPrint';
import { Icon } from '../../components/icon/Icon';
import { PageHero } from '../../components/page-hero/PageHero';
import { SiteImage } from '../../components/site-image/SiteImage';
import { DEFAULT_WHATSAPP } from '../../content/site';
import { FosterRequestForm } from '../../features/help-requests/FosterRequestForm';
import { useDocumentTitle } from '../../lib/use-document-title';
import { Feature } from '../../features/site-features/Feature';
import { useSiteSettings } from '../../services/api/public';
import { whatsappUrl } from '@patinhas/shared';
import pageStyles from '../shared/page.module.css';
import { HelpCardHead } from './HelpCardHead';
import { PixCard } from './PixCard';
import styles from './help.module.css';

const FALLBACK_ADOPTION =
    'https://www.adoteca.com.br/protetor/patinhas-carentes-joinville-joinville-sc-5nwgys';
const SHOP = [
    ['loja-cadernetas.jpg', 'Cadernetas'],
    ['loja-canecas.jpg', 'Canecas'],
    ['loja-camisetas.jpg', 'Camisetas'],
    ['loja-bottons.jpg', 'Bottons'],
] as const;
const FOSTER_FACTS = [
    'Fica com você até ele encontrar uma família',
    'Você decide quantos e quando, conforme a sua disponibilidade',
] as const;

export function HelpPage() {
    useDocumentTitle('Como ajudar | Patinhas Carentes Joinville');
    const settings = useSiteSettings();
    const whatsapp = settings.data?.whatsappNumber ?? DEFAULT_WHATSAPP;
    const adoption = settings.data?.adoptionUrl ?? FALLBACK_ADOPTION;

    return (
        <>
            <PageHero kicker="Como ajudar" title="Tem mais de um jeito de fazer a diferença." />

            <div className={pageStyles['grid']}>
                <section className={styles['feature']} aria-labelledby="foster-title">
                    <PawPrint className={styles['featurePaw']} />
                    <div className={styles['featureText']}>
                        <span className={styles['tag']}>Nossa maior necessidade</span>
                        <h2 id="foster-title">Ser lar temporário</h2>
                        <p>
                            Você recebe um animal em casa, com carinho e paciência, até ele
                            encontrar uma família.
                        </p>
                        <ul className={styles['facts']}>
                            {FOSTER_FACTS.map((fact) => (
                                <li key={fact}>
                                    <Icon name="check" /> {fact}
                                </li>
                            ))}
                        </ul>
                        <details className={styles['fold']}>
                            <summary>Quero acolher</summary>
                            <div className={styles['foldForm']}>
                                <FosterRequestForm />
                            </div>
                        </details>
                    </div>
                    <div className={styles['featurePhoto']}>
                        <SiteImage
                            file="ig-post1.jpg"
                            alt="Cachorro resgatado"
                            width={480}
                            height={640}
                        />
                    </div>
                </section>

                <article className={styles['adopt']}>
                    <SiteImage
                        file="ig-post3.jpg"
                        alt="Filhotes resgatados"
                        className={styles['adoptPhoto']}
                        width={640}
                        height={640}
                    />
                    <span className={styles['adoptTag']}>
                        <PawPrint /> Adoção
                    </span>
                    <div className={styles['adoptBody']}>
                        <h2>Adotar um bichinho</h2>
                        <p>
                            Os animais para adoção ficam cadastrados no Adoteca, com fotos e
                            informações. O botão abre a página da ONG lá.
                        </p>
                        <a
                            className={buttonClass({ variant: 'sun', size: 'xl' })}
                            href={adoption}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Icon name="paw" /> Ver quem espera um lar
                        </a>
                    </div>
                </article>

                <div className={pageStyles['acard']}>
                    <HelpCardHead icon="store" title="Loja Patinhas" />
                    <p>
                        Todo o valor da loja vai para a causa animal: castrações, ração e remédios.
                    </p>
                    <div className={styles['shop']}>
                        {SHOP.map(([file, alt]) => (
                            <SiteImage key={file} file={file} alt={alt} width={240} height={240} />
                        ))}
                    </div>
                    <a
                        className={buttonClass({ variant: 'teal', size: 'xl' })}
                        href={whatsappUrl(
                            whatsapp,
                            'Olá! Quero comprar um produto da Loja Patinhas',
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="wa" /> Comprar pelo WhatsApp
                    </a>
                </div>

                <div className={pageStyles['acard']}>
                    <HelpCardHead icon="heart" title="Ajudar nas feirinhas" />
                    <p>
                        Estar presente nas feirinhas de adoção e nos mutirões de microchipagem,
                        ajudando com cuidado, limpeza e fichas. Chame no WhatsApp para entrar na
                        programação.
                    </p>
                    <a
                        className={buttonClass({ variant: 'line', size: 'xl' })}
                        href={whatsappUrl(whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="wa" /> Chamar no WhatsApp
                    </a>
                </div>

                <PixCard pixKey={settings.data?.pixKey ?? null} whatsapp={whatsapp} />
            </div>

            <Feature name="page.denounce">
                <div className={`${pageStyles['cta']} ${pageStyles['ctaPink']}`}>
                    <h2>Viu maus-tratos?</h2>
                    <p>Veja os telefones e o passo a passo para denunciar.</p>
                    <Link className={buttonClass({ variant: 'sun', size: 'xl' })} to="/denuncia">
                        Como denunciar
                    </Link>
                </div>
            </Feature>
        </>
    );
}
