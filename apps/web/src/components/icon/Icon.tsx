import { ICONS, type IconName, type IconShape } from './icon-data';

interface IconProps {
    name: IconName;
    className?: string | undefined;
}

export function Icon({ name, className }: IconProps) {
    const shapes: IconShape[] = ICONS[name];
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            width="1.5em"
            height="1.5em"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            style={{ flex: 'none' }}
        >
            {shapes.map(({ tag, ...attributes }, index) => {
                const Shape = tag;
                return <Shape key={index} {...attributes} />;
            })}
        </svg>
    );
}
