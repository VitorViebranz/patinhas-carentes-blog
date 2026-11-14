import type { FeatureKey } from '@patinhas/shared';
import type { ReactNode } from 'react';
import { StateMessage } from '../../components/state-message/StateMessage';
import { UnavailablePage } from '../../pages/placeholder/PlaceholderPage';
import { useSiteFeatures } from './useSiteFeatures';

interface PageGateProps {
    feature: FeatureKey;
    children: ReactNode;
}

export function PageGate({ feature, children }: PageGateProps) {
    const { ready, isVisible } = useSiteFeatures();
    if (!ready) return <StateMessage kind="loading">Carregando...</StateMessage>;
    return isVisible(feature) ? <>{children}</> : <UnavailablePage />;
}
