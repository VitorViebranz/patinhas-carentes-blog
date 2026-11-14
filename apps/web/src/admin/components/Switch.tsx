import styles from '../admin.module.css';

interface SwitchProps {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onChange: (next: boolean) => void;
}

export function Switch({ checked, label, disabled = false, onChange }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            className={styles['switch']}
            onClick={() => onChange(!checked)}
        >
            <span className={styles['switchTrack']} aria-hidden="true">
                <span className={styles['switchKnob']} />
            </span>
            <span className={styles['switchText']}>{checked ? 'Ligado' : 'Desligado'}</span>
        </button>
    );
}
