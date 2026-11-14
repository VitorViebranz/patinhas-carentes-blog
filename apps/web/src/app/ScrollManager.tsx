import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ScrollManager() {
    const { pathname, hash, key } = useLocation();
    const firstRender = useRef(true);

    useEffect(() => {
        const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
        const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        if (target) {
            target.scrollIntoView({ behavior, block: 'start' });
            return;
        }
        window.scrollTo(0, 0);
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        document.getElementById('conteudo')?.focus({ preventScroll: true });
    }, [pathname, hash, key]);

    return null;
}
