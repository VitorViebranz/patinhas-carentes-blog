import { FEATURES, isHidden, type FeatureKey } from '@patinhas/shared';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icon/Icon';
import { useAdminSettings, useSession } from '../../services/api/admin';
import styles from '../admin.module.css';

interface FeatureNoticeProps {
    feature: FeatureKey;
}

export function FeatureNotice({ feature }: FeatureNoticeProps) {
    const settings = useAdminSettings();
    const isAdmin = useSession().data?.role === 'ADMIN';
    const label = FEATURES.find((item) => item.key === feature)?.label ?? '';

    if (!settings.data || !isHidden(settings.data.hiddenFeatures, feature)) return null;

    return (
        <div className={styles['vizNotice']} role="note">
            <Icon name="eyeOff" />
            <div>
                <b>A página “{label}” está desligada no site.</b>
                <span>
                    O que você escrever aqui só aparece para o público quando ela for ligada.{' '}
                    {isAdmin ? (
                        <Link to="/admin/visibilidade">Ligar em Páginas e seções</Link>
                    ) : (
                        'Peça a um administrador para ligar.'
                    )}
                </span>
            </div>
        </div>
    );
}
