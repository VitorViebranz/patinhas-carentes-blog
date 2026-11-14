import { useState, type CSSProperties } from 'react';
import styles from './site-image.module.css';

interface SiteImageProps {
    file: string;
    alt: string;
    className?: string | undefined;
    width?: number;
    height?: number;
    loading?: 'lazy' | 'eager';
    style?: CSSProperties;
}

export function SiteImage({
    file,
    alt,
    className,
    width,
    height,
    loading = 'lazy',
    style,
}: SiteImageProps) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div
                className={[styles['placeholder'], className].filter(Boolean).join(' ')}
                style={style}
                {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
            />
        );
    }

    return (
        <img
            src={`/images/${file}`}
            alt={alt}
            className={className}
            style={style}
            loading={loading}
            decoding="async"
            onError={() => {
                setFailed(true);
            }}
            {...(width ? { width } : {})}
            {...(height ? { height } : {})}
        />
    );
}
