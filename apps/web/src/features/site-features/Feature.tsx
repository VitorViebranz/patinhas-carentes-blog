import type { FeatureKey } from '@patinhas/shared';
import type { ReactNode } from 'react';
import { useSiteFeatures } from './useSiteFeatures';

interface FeatureProps {
    name: FeatureKey | readonly FeatureKey[];
    children: ReactNode;
}

export function Feature({ name, children }: FeatureProps) {
    const { isVisible } = useSiteFeatures();
    return isVisible(name) ? <>{children}</> : null;
}
