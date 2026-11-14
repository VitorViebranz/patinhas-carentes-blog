export interface IconShape {
    tag: 'path' | 'circle' | 'rect';
    [attribute: string]: string;
}

export const ICONS = {
    chevronLeft: [{ tag: 'path', d: 'M15 6l-6 6l6 6' }],
    chevronRight: [{ tag: 'path', d: 'M9 6l6 6l-6 6' }],
    sun: [
        { tag: 'path', d: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' },
        {
            tag: 'path',
            d: 'M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7',
        },
    ],
    moon: [
        {
            tag: 'path',
            d: 'M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z',
        },
    ],
    desktop: [
        {
            tag: 'path',
            d: 'M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10',
        },
        { tag: 'path', d: 'M7 20h10' },
        { tag: 'path', d: 'M9 16v4' },
        { tag: 'path', d: 'M15 16v4' },
    ],
    pin: [
        { tag: 'path', d: 'M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0' },
        {
            tag: 'path',
            d: 'M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z',
        },
    ],
    phone: [
        {
            tag: 'path',
            d: 'M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2',
        },
    ],
    home: [
        { tag: 'path', d: 'M5 12l-2 0l9 -9l9 9l-2 0' },
        { tag: 'path', d: 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7' },
        { tag: 'path', d: 'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6' },
    ],
    heart: [
        {
            tag: 'path',
            d: 'M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572',
        },
    ],
    school: [
        { tag: 'path', d: 'M22 9l-10 -4l-10 4l10 4l10 -4v6' },
        { tag: 'path', d: 'M6 10.6v5.4a6 3 0 0 0 12 0v-5.4' },
    ],
    alert: [
        {
            tag: 'path',
            d: 'M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3',
        },
        { tag: 'path', d: 'M12 11v4' },
        { tag: 'path', d: 'M12 8h.01' },
    ],
    go: [{ tag: 'path', d: 'M9 6l6 6l-6 6' }],
    check: [{ tag: 'path', d: 'M5 12l5 5l10 -10' }],
    x: [
        { tag: 'path', d: 'M18 6l-12 12' },
        { tag: 'path', d: 'M6 6l12 12' },
    ],
    wa: [
        { tag: 'path', d: 'M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9' },
        {
            tag: 'path',
            d: 'M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1',
        },
    ],
    print: [
        {
            tag: 'path',
            d: 'M17 17h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h2',
        },
        { tag: 'path', d: 'M17 9v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4' },
        {
            tag: 'path',
            d: 'M7 13m0 2a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z',
        },
    ],
    copy: [
        {
            tag: 'path',
            d: 'M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z',
        },
        {
            tag: 'path',
            d: 'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
        },
    ],
    cap: [
        { tag: 'circle', cx: '12', cy: '12', r: '9' },
        { tag: 'circle', cx: '12', cy: '12', r: '4.5' },
    ],
    locate: [
        { tag: 'path', d: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0' },
        { tag: 'path', d: 'M12 2v4' },
        { tag: 'path', d: 'M12 18v4' },
        { tag: 'path', d: 'M2 12h4' },
        { tag: 'path', d: 'M18 12h4' },
    ],
    chart: [
        { tag: 'path', d: 'M4 19l16 0' },
        { tag: 'path', d: 'M4 15l4 -6l4 2l4 -5l4 4' },
    ],
    store: [
        { tag: 'path', d: 'M3 21l18 0' },
        {
            tag: 'path',
            d: 'M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4',
        },
        { tag: 'path', d: 'M5 21l0 -10.15' },
        { tag: 'path', d: 'M19 21l0 -10.15' },
        { tag: 'path', d: 'M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4' },
    ],
    truck: [
        { tag: 'path', d: 'M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' },
        { tag: 'path', d: 'M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' },
        { tag: 'path', d: 'M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5' },
    ],
    recycle: [
        { tag: 'path', d: 'M12 21v-9' },
        { tag: 'path', d: 'M12 12l-6 -4' },
        { tag: 'path', d: 'M12 12l6 -4' },
        { tag: 'circle', cx: '12', cy: '4', r: '1' },
    ],
    paw: [
        { tag: 'circle', cx: '6', cy: '10', r: '2' },
        { tag: 'circle', cx: '10', cy: '5.5', r: '2' },
        { tag: 'circle', cx: '15', cy: '5.5', r: '2' },
        { tag: 'circle', cx: '19', cy: '10', r: '2' },
        {
            tag: 'path',
            d: 'M8.5 17c0 -3 2 -5.5 3.5 -5.5s3.5 2.5 3.5 5.5c0 2 -1.5 3 -3.5 3s-3.5 -1 -3.5 -3z',
        },
    ],
    gift: [
        {
            tag: 'path',
            d: 'M3 8m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z',
        },
        { tag: 'path', d: 'M12 8l0 13' },
        { tag: 'path', d: 'M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7' },
        {
            tag: 'path',
            d: 'M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5',
        },
    ],
    lock: [
        { tag: 'rect', x: '5', y: '11', width: '14', height: '10', rx: '2' },
        { tag: 'path', d: 'M8 11v-4a4 4 0 0 1 8 0v4' },
    ],
    dash: [
        { tag: 'path', d: 'M4 4h6v8h-6z' },
        { tag: 'path', d: 'M4 16h6v4h-6z' },
        { tag: 'path', d: 'M14 12h6v8h-6z' },
        { tag: 'path', d: 'M14 4h6v4h-6z' },
    ],
    inbox: [
        {
            tag: 'path',
            d: 'M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z',
        },
        { tag: 'path', d: 'M4 13h3l3 3h4l3 -3h3' },
    ],
    file: [
        { tag: 'path', d: 'M14 3v4a1 1 0 0 0 1 1h4' },
        {
            tag: 'path',
            d: 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z',
        },
        { tag: 'path', d: 'M9 13h6' },
        { tag: 'path', d: 'M9 17h6' },
    ],
    logout: [
        {
            tag: 'path',
            d: 'M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2',
        },
        { tag: 'path', d: 'M9 12h12l-3 -3' },
        { tag: 'path', d: 'M18 15l3 -3' },
    ],
    search: [
        { tag: 'path', d: 'M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0' },
        { tag: 'path', d: 'M21 21l-6 -6' },
    ],
    plus: [
        { tag: 'path', d: 'M12 5v14' },
        { tag: 'path', d: 'M5 12h14' },
    ],
    download: [
        { tag: 'path', d: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2' },
        { tag: 'path', d: 'M7 11l5 5l5 -5' },
        { tag: 'path', d: 'M12 4v12' },
    ],
    ext: [
        { tag: 'path', d: 'M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6' },
        { tag: 'path', d: 'M11 13l9 -9' },
        { tag: 'path', d: 'M15 4h5v5' },
    ],
    share: [
        { tag: 'path', d: 'M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
        { tag: 'path', d: 'M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
        { tag: 'path', d: 'M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
        { tag: 'path', d: 'M8.7 10.7l6.6 -3.4' },
        { tag: 'path', d: 'M8.7 13.3l6.6 3.4' },
    ],
    book: [
        { tag: 'path', d: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0' },
        { tag: 'path', d: 'M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0' },
        { tag: 'path', d: 'M3 6l0 13' },
        { tag: 'path', d: 'M12 6l0 13' },
        { tag: 'path', d: 'M21 6l0 13' },
    ],
    pencil: [
        { tag: 'path', d: 'M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4' },
        { tag: 'path', d: 'M13.5 6.5l4 4' },
    ],
    trash: [
        { tag: 'path', d: 'M4 7l16 0' },
        { tag: 'path', d: 'M10 11l0 6' },
        { tag: 'path', d: 'M14 11l0 6' },
        { tag: 'path', d: 'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12' },
        { tag: 'path', d: 'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3' },
    ],
    eye: [
        { tag: 'path', d: 'M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0' },
        {
            tag: 'path',
            d: 'M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6',
        },
    ],
    eyeOff: [
        { tag: 'path', d: 'M10.585 10.587a2 2 0 0 0 2.829 2.828' },
        {
            tag: 'path',
            d: 'M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87',
        },
        { tag: 'path', d: 'M3 3l18 18' },
    ],
    refresh: [
        { tag: 'path', d: 'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4' },
        { tag: 'path', d: 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4' },
    ],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;
