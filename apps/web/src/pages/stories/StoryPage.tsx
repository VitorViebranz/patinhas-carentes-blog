import { Link, useParams } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { StateMessage } from '../../components/state-message/StateMessage';
import { ApiError } from '../../services/api/client';
import { formatShortDate, paragraphs } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import { Feature } from '../../features/site-features/Feature';
import { useStory } from '../../services/api/public';
import { NotFoundPage } from '../placeholder/PlaceholderPage';
import styles from './stories.module.css';

export function StoryPage() {
    const { slug = '' } = useParams();
    const story = useStory(slug);
    useDocumentTitle(
        story.data
            ? `${story.data.title} | Patinhas Carentes Joinville`
            : 'Histórias | Patinhas Carentes Joinville',
    );

    if (story.isPending)
        return <StateMessage kind="loading">Carregando a história...</StateMessage>;
    if (story.isError) {
        if (story.error instanceof ApiError && story.error.status === 404) return <NotFoundPage />;
        return (
            <StateMessage kind="error" onRetry={() => void story.refetch()}>
                Não foi possível carregar a história.
            </StateMessage>
        );
    }

    const { data } = story;
    return (
        <article className={styles['detail']}>
            <Link to="/historias" className={styles['back']}>
                ← Todas as histórias
            </Link>
            {data.publishedAt ? (
                <span className={styles['date']}>{formatShortDate(data.publishedAt)}</span>
            ) : null}
            <h1>{data.title}</h1>
            {data.coverUrl ? <img src={data.coverUrl} alt={data.coverAlt ?? ''} /> : null}
            {paragraphs(data.body).map((text) => (
                <p key={text}>{text}</p>
            ))}
            <Feature name="page.help">
                <Link className={buttonClass({ variant: 'sun', size: 'xl' })} to="/como-ajudar">
                    Ver como ajudar
                </Link>
            </Feature>
        </article>
    );
}
