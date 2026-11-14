import { Link, useParams } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { Icon } from '../../components/icon/Icon';
import { StateMessage } from '../../components/state-message/StateMessage';
import { DEFAULT_INSTAGRAM } from '../../content/site';
import { todayInBrazil } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import { ApiError } from '../../services/api/client';
import { usePointImpact, useSiteSettings } from '../../services/api/public';
import { Certificate } from './Certificate';
import styles from './certificate.module.css';

export function CertificatePage() {
    const { id = '' } = useParams();
    const impact = usePointImpact(id);
    const settings = useSiteSettings();
    useDocumentTitle(
        impact.data
            ? `Certificado de ${impact.data.point.name} | Patinhas Carentes Joinville`
            : 'Certificado | Patinhas Carentes Joinville',
    );

    if (impact.isPending) {
        return <StateMessage kind="loading">Preparando o certificado...</StateMessage>;
    }
    if (impact.isError) {
        const notFound = impact.error instanceof ApiError && impact.error.status === 404;
        return notFound ? (
            <div className={styles['notice']}>
                <h1>Não achamos esse ponto</h1>
                <p>O endereço pode estar errado ou o ponto saiu da lista.</p>
                <Link className={buttonClass({ variant: 'sun' })} to="/placar">
                    Ver o placar
                </Link>
            </div>
        ) : (
            <StateMessage kind="error" onRetry={() => void impact.refetch()}>
                Não foi possível carregar o certificado agora.
            </StateMessage>
        );
    }

    const data = impact.data;
    if (data.pickups === 0) {
        return (
            <div className={styles['notice']}>
                <h1>{data.point.name}</h1>
                <p>
                    Este ponto ainda não teve retiradas. Assim que a equipe recolher as tampinhas, o
                    certificado fica pronto aqui.
                </p>
                <Link className={buttonClass({ variant: 'sun' })} to="/placar">
                    Ver o placar
                </Link>
            </div>
        );
    }

    return (
        <section className={styles['page']}>
            <div className={styles['actions']}>
                <button
                    className={buttonClass({ variant: 'sun', size: 'xl' })}
                    type="button"
                    onClick={() => window.print()}
                >
                    <Icon name="print" /> Imprimir o certificado
                </button>
                <Link className={buttonClass({ variant: 'line', size: 'xl' })} to="/placar">
                    Voltar ao placar
                </Link>
            </div>
            <div className={styles['stage']}>
                <Certificate
                    impact={data}
                    instagram={settings.data?.instagramHandle ?? DEFAULT_INSTAGRAM}
                    issuedOn={todayInBrazil()}
                />
            </div>
        </section>
    );
}
