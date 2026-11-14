import type { ReactNode } from 'react';
import { PawPrint } from '../decor/PawPrint';
import styles from '../../pages/shared/page.module.css';

interface PageHeroProps {
    kicker: string;
    title: string;
    children?: ReactNode;
}

export function PageHero({ kicker, title, children }: PageHeroProps) {
    return (
        <section className={styles['hero']}>
            <PawPrint className={styles['heroPaw']} />
            <p className={styles['kicker']}>{kicker}</p>
            <h1>{title}</h1>
            {children ? <p className={styles['lede']}>{children}</p> : null}
        </section>
    );
}
