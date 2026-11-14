import { isHidden, type FeatureKey } from '@patinhas/shared';
import { useSiteSettings } from '../../services/api/public';

type Keys = FeatureKey | readonly FeatureKey[];

export function useSiteFeatures() {
    const settings = useSiteSettings();
    const ready = settings.isSuccess || settings.isError;
    const hidden = settings.data?.hiddenFeatures ?? [];

    const isVisible = (keys: Keys): boolean => {
        if (!ready) return false;
        const list = typeof keys === 'string' ? [keys] : keys;
        return list.every((key) => !isHidden(hidden, key));
    };

    return { ready, isVisible };
}
