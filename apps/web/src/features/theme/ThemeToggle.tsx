import { Icon } from '../../components/icon/Icon';
import styles from './theme.module.css';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
    const { resolved, toggle } = useTheme();
    const goingDark = resolved === 'light';
    return (
        <button
            type="button"
            className={styles['toggle']}
            onClick={toggle}
            aria-label={goingDark ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
            title={goingDark ? 'Tema escuro' : 'Tema claro'}
        >
            <Icon name={goingDark ? 'moon' : 'sun'} />
        </button>
    );
}
