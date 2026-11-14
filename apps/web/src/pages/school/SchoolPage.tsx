import { useState } from 'react';
import { buttonClass } from '../../components/button/Button';
import { Icon } from '../../components/icon/Icon';
import { PageHero } from '../../components/page-hero/PageHero';
import { DEFAULT_INSTAGRAM } from '../../content/site';
import { SpaceRequestForm } from '../../features/help-requests/SpaceRequestForm';
import { Poster } from '../../features/poster/Poster';
import {
    DEFAULT_SPACE_NAME,
    MAX_SPACE_NAME_LENGTH,
    posterMessage,
} from '../../features/poster/poster-text';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useSiteSettings } from '../../services/api/public';
import pageStyles from '../shared/page.module.css';
import styles from './school.module.css';

const STEPS = [
    ['Você preenche o pedido', 'Leva dois minutos. Ou chame no WhatsApp.'],
    ['Imprime o cartaz abaixo', 'Já vem com o nome do seu espaço e o QR code.'],
    ['A equipe busca', 'Seu espaço aparece no mapa do site para todo mundo achar.'],
] as const;

export function SchoolPage() {
    useDocumentTitle('Seja um ponto de coleta | Patinhas Carentes Joinville');
    const settings = useSiteSettings();
    const instagram = settings.data?.instagramHandle ?? DEFAULT_INSTAGRAM;
    const [name, setName] = useState(DEFAULT_SPACE_NAME);
    const [copied, setCopied] = useState(false);
    const message = posterMessage(name);
    const url = `${window.location.origin}/#achar`;

    async function copy() {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    }

    return (
        <>
            <PageHero
                kicker="Seja um ponto de coleta"
                title="Sua escola, empresa ou loja pode ser um ponto de coleta."
            >
                Sem burocracia. Você guarda as tampinhas, a equipe passa para buscar. A equipe
                responde pelo WhatsApp, normalmente em até 2 horas.
            </PageHero>

            <section className={pageStyles['block']}>
                <h2>Como funciona</h2>
                <div className={pageStyles['steps']}>
                    {STEPS.map(([title, text], index) => (
                        <div key={title} className={pageStyles['step']}>
                            <span className={pageStyles['num']}>{index + 1}</span>
                            <div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className={pageStyles['block']}>
                <div className={pageStyles['stepHead']}>
                    <span className={pageStyles['num']}>1</span>
                    <h2>Faça o pedido</h2>
                </div>
                <p className={pageStyles['lede']}>
                    Leva dois minutos. Se quiser, peça também uma palestra gratuita sobre abandono e
                    cuidado com os animais.
                </p>
            </section>
            <SpaceRequestForm />

            <section className={pageStyles['block']}>
                <div className={pageStyles['stepHead']}>
                    <span className={pageStyles['num']}>2</span>
                    <h2>Imprima o cartaz</h2>
                </div>
                <p className={pageStyles['lede']}>
                    Digite o nome do seu espaço e veja o cartaz na hora.
                </p>
                <div className={styles['kit']}>
                    <div className={styles['kitForm']}>
                        <div className={pageStyles['field']}>
                            <label htmlFor="poster-name">Nome da escola, empresa ou loja</label>
                            <input
                                id="poster-name"
                                className={pageStyles['input']}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={MAX_SPACE_NAME_LENGTH}
                                autoComplete="off"
                            />
                        </div>
                        <button
                            className={buttonClass({ variant: 'sun', size: 'xl' })}
                            type="button"
                            onClick={() => window.print()}
                        >
                            <Icon name="print" /> Imprimir o cartaz
                        </button>
                        <div className={pageStyles['field']}>
                            <label htmlFor="poster-message">
                                Mensagem pronta para avisar pais ou funcionários
                            </label>
                            <textarea
                                id="poster-message"
                                className={styles['message']}
                                readOnly
                                value={message}
                            />
                        </div>
                        <button
                            className={buttonClass({ variant: 'line', size: 'xl' })}
                            type="button"
                            onClick={() => void copy()}
                        >
                            <Icon name="copy" /> {copied ? 'Mensagem copiada' : 'Copiar mensagem'}
                        </button>
                        <p className={pageStyles['fine']}>
                            O QR code leva para a busca de pontos de coleta.
                        </p>
                    </div>
                    <div className={styles['stage']}>
                        <Poster name={name} instagram={instagram} url={url} />
                    </div>
                </div>
            </section>
        </>
    );
}
