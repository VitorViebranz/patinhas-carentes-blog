import { Icon } from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/icon-data';
import { THEME_OPTIONS, type ThemePreference } from './theme';
import styles from './theme.module.css';
import { useTheme } from './ThemeProvider';

const ICON_BY_OPTION: Record<ThemePreference, IconName> = {
    system: 'desktop',
    light: 'sun',
    dark: 'moon',
};

export function ThemeSelector() {
    const { preference, setPreference } = useTheme();
    return (
        <div className={styles['selector']} role="group" aria-label="Aparência do site">
            {THEME_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={preference === option.value}
                    onClick={() => setPreference(option.value)}
                >
                    <Icon name={ICON_BY_OPTION[option.value]} />
                    {option.label}
                </button>
            ))}
        </div>
    );
}
