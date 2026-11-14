import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/icon-data';
import styles from '../admin.module.css';

interface IconButtonProps {
    icon: IconName;
    label: string;
    tone?: 'default' | 'danger';
    disabled?: boolean;
    onClick: () => void;
}

interface TooltipPosition {
    top: number;
    left: number;
    side: 'above' | 'below';
    align: 'start' | 'center' | 'end';
}

const GAP_PX = 8;
const EDGE_PX = 120;
const MIN_ROOM_ABOVE_PX = 56;

function positionFor(rect: DOMRect): TooltipPosition {
    const center = rect.left + rect.width / 2;
    const side = rect.top < MIN_ROOM_ABOVE_PX ? 'below' : 'above';
    const top = side === 'above' ? rect.top - GAP_PX : rect.bottom + GAP_PX;
    if (center < EDGE_PX) return { top, left: rect.left, side, align: 'start' };
    if (window.innerWidth - center < EDGE_PX) return { top, left: rect.right, side, align: 'end' };
    return { top, left: center, side, align: 'center' };
}

export function IconButton({
    icon,
    label,
    tone = 'default',
    disabled = false,
    onClick,
}: IconButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<TooltipPosition | null>(null);

    const show = () => {
        if (buttonRef.current) setPosition(positionFor(buttonRef.current.getBoundingClientRect()));
    };
    const hide = () => setPosition(null);

    useEffect(() => {
        if (!position) return undefined;
        const close = (event: Event) => {
            if (event.type !== 'keydown' || (event as KeyboardEvent).key === 'Escape') {
                setPosition(null);
            }
        };
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        window.addEventListener('keydown', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', close);
        };
    }, [position]);

    return (
        <span className={styles['tip']}>
            <button
                ref={buttonRef}
                type="button"
                className={`${styles['iconBtn']} ${tone === 'danger' ? styles['iconBtnDanger'] : ''}`}
                aria-label={label}
                disabled={disabled}
                onClick={onClick}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                <Icon name={icon} />
            </button>
            {position
                ? createPortal(
                      <span
                          className={styles['bubble']}
                          data-side={position.side}
                          data-align={position.align}
                          style={{ top: position.top, left: position.left }}
                          aria-hidden="true"
                      >
                          {label}
                      </span>,
                      document.body,
                  )
                : null}
        </span>
    );
}
