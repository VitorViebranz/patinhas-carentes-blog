import type { ButtonHTMLAttributes } from 'react';
import styles from './button.module.css';

export type ButtonVariant = 'sun' | 'teal' | 'pink' | 'line' | 'ghost';
export type ButtonSize = 'md' | 'sm' | 'xl';

interface ButtonStyle {
    variant?: ButtonVariant | undefined;
    size?: ButtonSize | undefined;
    className?: string | undefined;
}

export function buttonClass({
    variant = 'teal',
    size = 'md',
    className,
}: ButtonStyle = {}): string {
    return [styles['btn'], styles[variant], size === 'md' ? '' : styles[size], className]
        .filter(Boolean)
        .join(' ');
}

type ButtonProps = ButtonStyle & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
    return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
