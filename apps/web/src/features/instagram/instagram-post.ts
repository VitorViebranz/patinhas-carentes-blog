import { monthlyReportFigures } from '@patinhas/shared';
import { formatMonth } from '../../lib/format';

export type PostFormat = 'feed' | 'story';

export interface PostInput {
    month: string;
    totalKg: number;
    goalKg: number;
    doseKg: number;
    gramsPerCap: number;
    outcome: string;
    instagram: string;
}

export interface PostTexts {
    headline: string;
    subtitle: string;
    caption: string;
}

const pt = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const dosesText = (count: number) =>
    count === 1 ? '1 dose de vacina' : `${pt(count)} doses de vacina`;

export function buildPostTexts(input: PostInput): PostTexts {
    const kg = Math.max(0, input.totalKg);
    const { capCount, doses, remainingKgToNextDose } = monthlyReportFigures(
        kg,
        input.goalKg,
        input.gramsPerCap,
        input.doseKg,
    );
    const month = formatMonth(input.month).toLowerCase();
    const subtitle =
        doses > 0
            ? `${pt(capCount)} tampinhas em ${month}: o suficiente para ${dosesText(doses)}. Faltam ${pt(remainingKgToNextDose)} kg para a próxima.`
            : `${pt(capCount)} tampinhas em ${month}. Faltam ${pt(remainingKgToNextDose)} kg para uma dose de vacina.`;
    const outcome = input.outcome.trim().replace(/\.$/, '');
    const caption =
        `Em ${month}, arrecadamos ${pt(kg)} kg de tampinhas, cerca de ${pt(capCount)} unidades` +
        (doses > 0 ? `, o suficiente para ${dosesText(doses)}` : '') +
        '.' +
        (outcome ? ` ${outcome}.` : '') +
        ' Cada tampinha guardada vira cuidado de verdade. Tem um ponto de coleta perto de você? Link na bio.' +
        ' #PatinhasCarentesJoinville #CampanhaDasTampinhas';
    return { headline: `${pt(kg)} kg`, subtitle, caption };
}

function wrap(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
) {
    let line = '';
    let top = y;
    for (const word of text.split(' ')) {
        const attempt = line ? `${line} ${word}` : word;
        if (ctx.measureText(attempt).width > maxWidth && line) {
            ctx.fillText(line, x, top);
            line = word;
            top += lineHeight;
        } else {
            line = attempt;
        }
    }
    ctx.fillText(line, x, top);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

export async function renderPostPng(
    texts: PostTexts,
    format: PostFormat,
    instagram: string,
): Promise<Blob> {
    const width = 1080;
    const height = format === 'story' ? 1920 : 1080;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível');

    ctx.fillStyle = '#0b3a37';
    ctx.fillRect(0, 0, width, height);
    const photo = await loadImage('/images/ig-post1.jpg');
    if (photo) {
        const scale = Math.max(width / photo.width, height / photo.height);
        ctx.drawImage(
            photo,
            (width - photo.width * scale) / 2,
            (height - photo.height * scale) / 2,
            photo.width * scale,
            photo.height * scale,
        );
    }
    const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height);
    gradient.addColorStop(0, 'rgba(6,34,32,0)');
    gradient.addColorStop(1, 'rgba(6,34,32,.94)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const pad = 70;
    const base = height - 90;
    ctx.fillStyle = '#F2B01E';
    ctx.font = '700 30px Montserrat, sans-serif';
    ctx.fillText('PRESTAÇÃO DE CONTAS', pad, base - 330);
    ctx.fillStyle = '#fff';
    ctx.font = '700 150px Montserrat, sans-serif';
    ctx.fillText(texts.headline, pad, base - 170);
    ctx.font = '400 38px Inter, sans-serif';
    wrap(ctx, texts.subtitle, pad, base - 100, width - pad * 2, 50);
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillStyle = '#D3E3E0';
    ctx.fillText(`@${instagram}`, pad, base + 40);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))),
            'image/png',
        );
    });
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
