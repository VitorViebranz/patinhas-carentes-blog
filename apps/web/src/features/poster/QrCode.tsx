import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

export function QrCode({ value, label }: { value: string; label: string }) {
    const svg = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    }, [value]);
    return <div role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
