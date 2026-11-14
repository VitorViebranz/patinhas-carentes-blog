interface PawPrintProps {
    className?: string | undefined;
}

export function PawPrint({ className }: PawPrintProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
        >
            <ellipse cx="4.6" cy="11" rx="2.1" ry="2.9" transform="rotate(-24 4.6 11)" />
            <ellipse cx="9.4" cy="5.8" rx="2.1" ry="2.9" transform="rotate(-8 9.4 5.8)" />
            <ellipse cx="14.8" cy="5.8" rx="2.1" ry="2.9" transform="rotate(8 14.8 5.8)" />
            <ellipse cx="19.6" cy="11" rx="2.1" ry="2.9" transform="rotate(24 19.6 11)" />
            <path d="M12 11.6c-3.1 0-5.9 3.3-5.9 6.2 0 1.9 1.4 3.1 3.3 3.1 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.9 0 3.3-1.2 3.3-3.1 0-2.9-2.8-6.2-5.9-6.2z" />
        </svg>
    );
}
