import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/button/Button';
import { PageHero } from '../../components/page-hero/PageHero';
import { StateMessage } from '../../components/state-message/StateMessage';
import { formatShortDate } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import { Feature } from '../../features/site-features/Feature';
import { useStories } from '../../services/api/public';
import pageStyles from '../shared/page.module.css';
import styles from './stories.module.css';

export function StoriesPage() {
    useDocumentTitle('Histórias de resgate | Patinhas Carentes Joinville');
    const stories = useStories();

    return (
        <>
            <PageHero kicker="Histórias" title="Histórias de resgate" />
            {stories.isPending ? (
                <StateMessage kind="loading">Carregando as histórias...</StateMessage>
            ) : null}
            {stories.isError ? (
                <StateMessage kind="error" onRetry={() => void stories.refetch()}>
                    Não foi possível carregar as histórias.
                </StateMessage>
            ) : null}
            {stories.isSuccess && stories.data.length === 0 ? (
                <div className={pageStyles['empty']}>
                    <StateMessage kind="empty">
                        As primeiras histórias aparecem aqui em breve.
                    </StateMessage>
                </div>
            ) : null}
            {stories.isSuccess ? (
                <div className={pageStyles['grid3']}>
                    {stories.data.map((story) => (
                        <article
                            key={story.id}
                            className={`${pageStyles['story']} ${styles['story']}`}
                        >
                            {story.coverUrl ? (
                                <img
                                    src={story.coverUrl}
                                    alt={story.coverAlt ?? ''}
                                    loading="lazy"
                                />
                            ) : null}
                            <div>
                                {story.publishedAt ? (
                                    <span className={styles['date']}>
                                        {formatShortDate(story.publishedAt)}
                                    </span>
                                ) : null}
                                <h3>
                                    <Link to={`/historias/${story.slug}`}>{story.title}</Link>
                                </h3>
                                <p>{story.excerpt}</p>
                            </div>
                        </article>
                    ))}
                </div>
            ) : null}
            <Feature name="page.help">
                <div className={pageStyles['cta']}>
                    <h2>Quer ajudar um deles?</h2>
                    <p>O lar temporário é o que mais falta hoje.</p>
                    <Link className={buttonClass({ variant: 'sun', size: 'xl' })} to="/como-ajudar">
                        Ver como ajudar
                    </Link>
                </div>
            </Feature>
        </>
    );
}
