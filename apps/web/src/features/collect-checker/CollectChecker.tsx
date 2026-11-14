import { useState } from 'react';
import { Icon } from '../../components/icon/Icon';
import { SiteImage } from '../../components/site-image/SiteImage';
import { CAN_COLLECT, CANNOT_COLLECT, COLLECT_ITEMS, type CollectItem } from '../../content/home';
import styles from './collect-checker.module.css';

const IDLE_HINT = 'Toque em um item para conferir. Em resumo:';

function resultOf(item: CollectItem): 'yes' | 'no' {
    return item.accepted ? 'yes' : 'no';
}

export function CollectChecker() {
    const [selected, setSelected] = useState<CollectItem | null>(null);
    const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
    const photo = selected && !selected.accepted ? 'no' : 'yes';
    const tone = selected ? resultOf(selected) : 'idle';

    function choose(item: CollectItem) {
        if (selected?.label === item.label) {
            setSelected(null);
            return;
        }
        setSelected(item);
        setChecked((current) => new Set(current).add(item.label));
    }

    return (
        <section className={styles['wrap']} aria-labelledby="checker-title">
            <p className={styles['kicker']}>Antes de ir</p>
            <h2 id="checker-title">Pode ou não pode? Confira aqui.</h2>
            <div className={styles['grid']}>
                <div className={styles['stage']}>
                    <div className={styles['photo']} data-photo="yes" data-on={photo === 'yes'}>
                        <SiteImage file="tampinhas-pode.jpg" alt="" width={562} height={316} />
                    </div>
                    <div className={styles['photo']} data-photo="no" data-on={photo === 'no'}>
                        <SiteImage file="tampinhas-nao-pode.jpg" alt="" width={562} height={316} />
                    </div>
                    <span className={styles['tag']} data-tone={photo}>
                        <Icon name={photo === 'yes' ? 'check' : 'x'} />
                        {photo === 'yes' ? 'Pode levar' : 'Não pode levar'}
                    </span>
                </div>

                <div className={styles['panel']}>
                    <div className={styles['chips']} role="group" aria-label="Itens para conferir">
                        {COLLECT_ITEMS.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                className={styles['chip']}
                                aria-pressed={selected?.label === item.label}
                                data-result={checked.has(item.label) ? resultOf(item) : undefined}
                                onClick={() => {
                                    choose(item);
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles['verdict']} data-tone={tone} role="status">
                        {selected ? (
                            <>
                                <h3>
                                    <Icon name={selected.accepted ? 'check' : 'x'} />
                                    {selected.accepted ? 'Pode levar' : 'Não pode levar'}
                                </h3>
                                <p>
                                    <b>{selected.title}</b>
                                    {selected.accepted
                                        ? ' é tampinha de plástico. Pode deixar no ponto de coleta.'
                                        : ' não entra. Só levamos tampinhas de plástico.'}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className={styles['hint']}>{IDLE_HINT}</p>
                                <p>
                                    <b>Pode:</b> {CAN_COLLECT}
                                </p>
                                <p>
                                    <b>Não pode:</b> {CANNOT_COLLECT}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
