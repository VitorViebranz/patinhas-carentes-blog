import { directionsUrl, telHref } from '@patinhas/shared';
import { Suspense, lazy, useId, useState } from 'react';
import { Icon } from '../../components/icon/Icon';
import { StateMessage } from '../../components/state-message/StateMessage';
import { buttonClass } from '../../components/button/Button';
import { useCollectionPoints, useNeighborhoods } from '../../services/api/public';
import type { CollectionPoint, Neighborhood } from '../../services/api/types';
import { PointList } from './PointList';
import { usePointFinder } from './use-point-finder';
import styles from './point-finder.module.css';

const PointMap = lazy(() => import('./PointMap'));

const OUTSIDE_NOTE =
    'Garuva, Pirabeiraba, Rio Bonito e São Francisco do Sul ficam fora desta vista. Escolha o bairro para vê-los.';

export function PointFinder() {
    const points = useCollectionPoints();
    const neighborhoods = useNeighborhoods();

    return (
        <>
            <section className={styles['head']} id="achar">
                <p className={styles['kicker']}>Depois de juntar</p>
                <h2>Ache o ponto de coleta mais perto de você</h2>
                <p className={styles['lede']}>
                    Os pontos aparecem no mapa e na lista, do mais perto para o mais longe.
                </p>
            </section>

            {points.isPending ? (
                <div className={styles['state']}>
                    <StateMessage kind="loading">Carregando os pontos de coleta...</StateMessage>
                </div>
            ) : points.isError ? (
                <div className={styles['state']}>
                    <StateMessage
                        kind="error"
                        onRetry={() => {
                            void points.refetch();
                        }}
                    >
                        Não deu para carregar os pontos de coleta. Confira a internet e tente de
                        novo.
                    </StateMessage>
                </div>
            ) : points.data.length === 0 ? (
                <div className={styles['state']}>
                    <StateMessage kind="empty">
                        Ainda não há pontos de coleta cadastrados. Fale com a gente pelo WhatsApp.
                    </StateMessage>
                </div>
            ) : (
                <PointFinderContent points={points.data} neighborhoods={neighborhoods.data ?? []} />
            )}
        </>
    );
}

interface ContentProps {
    points: readonly CollectionPoint[];
    neighborhoods: readonly Neighborhood[];
}

export function PointFinderContent({ points, neighborhoods }: ContentProps) {
    const finder = usePointFinder(points, neighborhoods);
    const listId = useId();
    const [listOpen, setListOpen] = useState(true);
    const inJoinville = neighborhoods.filter((item) => !item.outsideMainArea);
    const elsewhere = neighborhoods.filter((item) => item.outsideMainArea);
    const shownPoints = finder.searchActive ? finder.results.map((entry) => entry.item) : points;
    const selected = finder.selection
        ? (points.find((point) => point.id === finder.selection?.id) ?? null)
        : null;
    const located = finder.reference?.kind === 'geolocation';
    const locateLabel = finder.locating
        ? 'Procurando...'
        : located
          ? 'Usando a sua localização'
          : 'Usar minha localização';

    return (
        <>
            <div className={styles['choice']}>
                <button
                    type="button"
                    className={styles['locate']}
                    aria-pressed={located}
                    disabled={finder.locating}
                    onClick={finder.locateMe}
                >
                    <Icon name={located ? 'check' : 'locate'} />
                    {locateLabel}
                </button>
                <span className={styles['or']}>ou</span>
                <div className={`${styles['pill']} ${styles['selectPill']}`}>
                    <Icon name="pin" className={styles['pillIcon']} />
                    <select
                        aria-label="Escolha o seu bairro"
                        className={styles['pillInput']}
                        value={finder.neighborhood}
                        onChange={(event) => {
                            finder.chooseNeighborhood(event.target.value);
                        }}
                    >
                        <option value="">Escolher o meu bairro</option>
                        <optgroup label="Joinville">
                            {inJoinville.map((item) => (
                                <option key={item.id} value={item.name}>
                                    {item.name}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Outros distritos e cidades">
                            {elsewhere.map((item) => (
                                <option key={item.id} value={item.name}>
                                    {item.name}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                    <Icon name="go" className={styles['pillChevron']} />
                </div>
            </div>

            <p className={styles['refLine']} aria-live="polite">
                <Icon name={located ? 'check' : 'pin'} />
                <span>{finder.statusLine}</span>
            </p>

            <div className={styles['grid']} data-list={listOpen ? 'open' : 'closed'}>
                <div className={styles['mapColumn']}>
                    <div className={styles['mapWrap']}>
                        <Suspense
                            fallback={
                                <div className={styles['mapBox']}>
                                    <StateMessage kind="loading">Carregando o mapa...</StateMessage>
                                </div>
                            }
                        >
                            <PointMap
                                points={shownPoints}
                                reference={finder.reference}
                                viewTargets={finder.viewTargets}
                                selection={finder.selection}
                                searchActive={finder.searchActive}
                                resultCount={finder.results.length}
                                onSelect={finder.select}
                            />
                        </Suspense>
                        {listOpen ? null : (
                            <button
                                type="button"
                                className={styles['listOpen']}
                                aria-expanded={false}
                                aria-controls={listId}
                                onClick={() => {
                                    setListOpen(true);
                                }}
                            >
                                <Icon name="go" className={styles['flip']} /> Mostrar lista (
                                {finder.results.length})
                            </button>
                        )}
                    </div>
                    <div className={styles['legend']}>
                        <span>
                            <i className={`${styles['legendPin']} ${styles['legendNormal']}`} />
                            Ponto de coleta
                        </span>
                        <span>
                            <i className={`${styles['legendPin']} ${styles['legendApprox']}`} />
                            Posição aproximada pelo bairro
                        </span>
                        {finder.reference ? (
                            <span>
                                <i className={`${styles['legendPin']} ${styles['legendMe']}`} />
                                Ponto de partida
                            </span>
                        ) : null}
                    </div>
                    {finder.searchActive ? null : <p className={styles['hint']}>{OUTSIDE_NOTE}</p>}

                    {selected ? (
                        <div
                            className={styles['selected']}
                            role="group"
                            aria-label="Ponto selecionado"
                        >
                            <div className={styles['selectedHead']}>
                                <strong>{selected.name}</strong>
                                <button
                                    type="button"
                                    className={styles['close']}
                                    onClick={finder.clearSelection}
                                >
                                    Fechar
                                </button>
                            </div>
                            <div className={styles['meta']}>
                                {selected.address ? `${selected.address} · ` : ''}Bairro{' '}
                                {selected.neighborhood}
                            </div>
                            <div className={styles['selectedActions']}>
                                {selected.phone ? (
                                    <a
                                        className={buttonClass({ variant: 'teal' })}
                                        href={telHref(selected.phone)}
                                    >
                                        Ligar {selected.phone}
                                    </a>
                                ) : null}
                                <a
                                    className={buttonClass({ variant: 'sun' })}
                                    href={directionsUrl(selected)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Como chegar
                                </a>
                            </div>
                            {selected.locationPrecision === 'NEIGHBORHOOD' ? (
                                <p className={styles['note']}>
                                    Posição aproximada pelo bairro. Use "Como chegar" para ir ao
                                    endereço exato.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <PointList
                    id={listId}
                    onCollapse={() => {
                        setListOpen(false);
                    }}
                    results={finder.results}
                    shown={finder.shown}
                    query={finder.query}
                    searchActive={finder.searchActive}
                    selection={finder.selection}
                    onQuery={finder.setQuery}
                    onShowMore={finder.showMore}
                    onSelect={finder.select}
                />
            </div>
        </>
    );
}
