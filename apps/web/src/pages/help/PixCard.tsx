import { formatCnpj, whatsappUrl } from '@patinhas/shared';
import { useState } from 'react';
import { buttonClass } from '../../components/button/Button';
import { Icon } from '../../components/icon/Icon';
import { VisuallyHidden } from '../../components/visually-hidden/VisuallyHidden';
import pageStyles from '../shared/page.module.css';
import { HelpCardHead } from './HelpCardHead';
import styles from './help.module.css';

const COPIED_MESSAGE_MS = 2200;

interface PixCardProps {
    pixKey: string | null;
    whatsapp: string;
}

export function PixCard({ pixKey, whatsapp }: PixCardProps) {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    async function copy(key: string) {
        try {
            await navigator.clipboard.writeText(key);
            setCopyFailed(false);
            setCopied(true);
            window.setTimeout(() => {
                setCopied(false);
            }, COPIED_MESSAGE_MS);
        } catch {
            setCopied(false);
            setCopyFailed(true);
        }
    }

    return (
        <div className={pageStyles['acard']}>
            <HelpCardHead icon="gift" title="Doar em dinheiro" />
            {pixKey ? (
                <>
                    <p>Faça um Pix para a ONG usando a chave abaixo.</p>
                    <div className={styles['pix']}>
                        <span>Chave Pix</span>
                        <b>{formatCnpj(pixKey)}</b>
                    </div>
                    <button
                        className={buttonClass({ variant: 'teal', size: 'xl' })}
                        type="button"
                        onClick={() => void copy(pixKey)}
                    >
                        <Icon name="copy" /> {copied ? 'Chave copiada' : 'Copiar chave Pix'}
                    </button>
                    <VisuallyHidden as="p" role="status">
                        {copied ? 'Chave Pix copiada.' : ''}
                    </VisuallyHidden>
                    {copyFailed ? (
                        <p role="alert">Não deu para copiar. Selecione a chave acima e copie.</p>
                    ) : null}
                </>
            ) : (
                <>
                    <p>
                        Para doar em dinheiro, chame no WhatsApp e passamos os dados com segurança.
                    </p>
                    <a
                        className={buttonClass({ variant: 'line', size: 'xl' })}
                        href={whatsappUrl(whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="wa" /> Chamar no WhatsApp
                    </a>
                </>
            )}
        </div>
    );
}
