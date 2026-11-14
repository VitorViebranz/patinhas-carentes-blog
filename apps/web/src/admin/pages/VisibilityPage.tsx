import { FEATURES, isHidden, type FeatureKey } from '@patinhas/shared';
import { Navigate } from 'react-router-dom';
import { StateMessage } from '../../components/state-message/StateMessage';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useAdminSettings, useSession, useSetFeatureVisible } from '../../services/api/admin';
import styles from '../admin.module.css';
import { Switch } from '../components/Switch';
import { useToast } from '../components/Toast';
import { VISIBILITY_GROUPS, describeOffCount } from '../visibility-groups';

export function VisibilityPage() {
    useDocumentTitle('Páginas e seções | Painel Patinhas');
    const session = useSession().data;
    const settings = useAdminSettings();
    const toast = useToast();
    const setVisible = useSetFeatureVisible();

    if (session && session.role !== 'ADMIN') return <Navigate to="/admin" replace />;
    if (settings.isPending) return <StateMessage kind="loading">Carregando...</StateMessage>;
    if (settings.isError) {
        return (
            <StateMessage kind="error" onRetry={() => void settings.refetch()}>
                Não foi possível carregar as opções.
            </StateMessage>
        );
    }

    const hidden = settings.data.hiddenFeatures;
    const pendingKey = setVisible.isPending ? setVisible.variables.key : null;

    function change(key: FeatureKey, label: string, visible: boolean) {
        setVisible.mutate(
            { key, visible },
            {
                onSuccess: () =>
                    toast(
                        visible
                            ? `${label}: ligado de novo.`
                            : `${label}: desligado. O público não vê mais.`,
                        visible
                            ? undefined
                            : {
                                  label: 'Desfazer',
                                  onClick: () => change(key, label, true),
                              },
                    ),
                onError: () => toast('Não foi possível salvar. Tente de novo.'),
            },
        );
    }

    return (
        <>
            <div className={styles['card']}>
                <p className={styles['muted']}>
                    Ligue ou desligue o que o público vê no site. A mudança vale em até 30 segundos.
                    O que for desligado continua no painel, só sai do ar.
                </p>
                <p className={styles['vizSummary']} role="status">
                    {describeOffCount(hidden.length)}
                </p>
            </div>

            {VISIBILITY_GROUPS.map((group) => (
                <section key={group.kind} className={styles['card']}>
                    <div className={styles['cardHead']}>
                        <h2>{group.title}</h2>
                    </div>
                    <p className={styles['muted']}>{group.hint}</p>
                    <ul className={styles['vizList']}>
                        {FEATURES.filter((feature) => feature.kind === group.kind).map(
                            (feature) => {
                                const on = !isHidden(hidden, feature.key);
                                return (
                                    <li
                                        key={feature.key}
                                        className={styles['vizRow']}
                                        data-off={!on}
                                    >
                                        <div>
                                            <b>{feature.label}</b>
                                            <p>{feature.description}</p>
                                            {'path' in feature && on ? (
                                                <a
                                                    className={styles['vizOpen']}
                                                    href={feature.path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Abrir no site
                                                </a>
                                            ) : null}
                                        </div>
                                        <Switch
                                            checked={on}
                                            label={feature.label}
                                            disabled={pendingKey === feature.key}
                                            onChange={(next) =>
                                                change(feature.key, feature.label, next)
                                            }
                                        />
                                    </li>
                                );
                            },
                        )}
                    </ul>
                </section>
            ))}
        </>
    );
}
