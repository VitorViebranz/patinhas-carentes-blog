import { PageHero } from '../../components/page-hero/PageHero';
import { DEFAULT_WHATSAPP } from '../../content/site';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useSiteSettings } from '../../services/api/public';
import { formatBrazilianPhone, whatsappUrl } from '@patinhas/shared';
import pageStyles from '../shared/page.module.css';
import styles from './privacy.module.css';

export function PrivacyPage() {
    useDocumentTitle('Privacidade | Patinhas Carentes Joinville');
    const whatsapp = useSiteSettings().data?.whatsappNumber ?? DEFAULT_WHATSAPP;

    return (
        <>
            <PageHero kicker="Privacidade" title="Como cuidamos dos seus dados" />
            <div className={styles['text']}>
                <h2>Quais dados vocês guardam?</h2>
                <p>
                    Só o que você escreve nos formulários: nome, WhatsApp ou e-mail, o nome do seu
                    espaço e o que você quiser contar. Não pedimos CPF nem endereço da sua casa.
                </p>
                <h2>Para que usamos?</h2>
                <p>
                    Apenas para a equipe responder o seu pedido (ponto de coleta, palestra ou lar
                    temporário). Não vendemos nem compartilhamos com empresas.
                </p>
                <h2>Quem vê esses dados?</h2>
                <p>Somente a equipe da ONG, na área restrita do site.</p>
                <h2>Por quanto tempo guardamos?</h2>
                <p>Pelo tempo necessário para responder e acompanhar o pedido.</p>
                <h2>E os cookies?</h2>
                <p>
                    O site público não usa cookies de rastreamento nem de publicidade. Só a área da
                    equipe usa um cookie de login. O mapa usa imagens do OpenStreetMap, e o botão
                    &quot;Minha localização&quot; só funciona se você permitir, e a posição não é
                    enviada para nós.
                </p>
                <h2>Quais são os seus direitos?</h2>
                <p>
                    Pela LGPD, você pode pedir para ver, corrigir ou apagar os seus dados a qualquer
                    momento. Chame a equipe no WhatsApp{' '}
                    <a
                        href={whatsappUrl(whatsapp, 'Olá! Quero falar sobre os meus dados no site')}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {formatBrazilianPhone(whatsapp)}
                    </a>
                    .
                </p>
                <p className={pageStyles['fine']}>
                    Este texto deve ser revisado pela ONG antes da publicação.
                </p>
            </div>
        </>
    );
}
