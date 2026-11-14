import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './placeholder.module.css';

interface PlaceholderPageProps {
    title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
    useDocumentTitle(`${title} | Patinhas Carentes Joinville`);
    return (
        <section className={styles['page']}>
            <h1>{title}</h1>
            <p>Esta página está sendo construída e chega na próxima etapa do site.</p>
            <Link className={buttonClass({ variant: 'sun' })} to="/">
                Voltar para o início
            </Link>
        </section>
    );
}

export function UnavailablePage() {
    useDocumentTitle('Página indisponível | Patinhas Carentes Joinville');
    return (
        <section className={styles['page']}>
            <h1>Esta página não está disponível</h1>
            <p>Ela foi tirada do ar por enquanto. Volte mais tarde ou comece pelo início.</p>
            <Link className={buttonClass({ variant: 'sun' })} to="/">
                Voltar para o início
            </Link>
        </section>
    );
}

export function NotFoundPage() {
    useDocumentTitle('Página não encontrada | Patinhas Carentes Joinville');
    return (
        <section className={styles['page']}>
            <h1>Não achamos essa página</h1>
            <p>O endereço pode ter mudado ou estar digitado errado.</p>
            <Link className={buttonClass({ variant: 'sun' })} to="/">
                Voltar para o início
            </Link>
        </section>
    );
}
