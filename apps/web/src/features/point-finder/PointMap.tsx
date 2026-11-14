import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { buttonClass } from '../../components/button/Button';
import type { CollectionPoint } from '../../services/api/types';
import type { Reference, Selection } from './use-point-finder';
import type { LatLon } from '@patinhas/shared';
import styles from './point-finder.module.css';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const JOINVILLE_VIEW: L.LatLngTuple = [-26.3045, -48.8487];

const CLUSTER_RADIUS = 40;
const CLUSTER_RADIUS_FEW_RESULTS = 22;
const NO_CLUSTER_ZOOM = 17;
const FOCUS_ZOOM = 15;
const MAX_FIT_ZOOM = 16;

const PIN_PATH = 'M0 0C-2-5-11-13-11-21A11 11 0 0 1 11-21C11-13 2-5 0 0Z';

function pinIcon(kind: 'normal' | 'approximate' | 'selected'): L.DivIcon {
    const fill = kind === 'selected' ? '#F5C84B' : kind === 'approximate' ? '#9ED9D4' : '#0A5753';
    const stroke = kind === 'selected' ? '#0A3D3A' : '#FFFFFF';
    const dot = kind === 'selected' ? '#0A3D3A' : kind === 'approximate' ? '#0A5753' : '#F5C84B';
    const dash = kind === 'approximate' ? ' stroke-dasharray="3 2"' : '';
    const scale = kind === 'selected' ? 1.3 : 1;
    return L.divIcon({
        className: styles['pin'] ?? '',
        html: `<svg width="${26 * scale}" height="${36 * scale}" viewBox="-13 -34 26 36" aria-hidden="true"><path d="${PIN_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="2"${dash}/><circle cx="0" cy="-21" r="4.5" fill="${dot}"/></svg>`,
        iconSize: [26 * scale, 36 * scale],
        iconAnchor: [13 * scale, 34 * scale],
    });
}

function clusterIcon(count: number): L.DivIcon {
    return L.divIcon({
        className: styles['pin'] ?? '',
        html: `<span class="${styles['cluster'] ?? ''}">${count}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
    });
}

function meIcon(label: string): L.DivIcon {
    return L.divIcon({
        className: styles['pin'] ?? '',
        html: `<span class="${styles['me'] ?? ''}"></span><span class="${styles['meLabel'] ?? ''}">${label}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
}

interface PointMapProps {
    points: readonly CollectionPoint[];
    reference: Reference | null;
    viewTargets: readonly LatLon[];
    selection: Selection | null;
    searchActive: boolean;
    resultCount: number;
    onSelect: (point: CollectionPoint, source: Selection['source']) => void;
}

function fitTo(map: L.Map, targets: readonly LatLon[]): void {
    if (targets.length === 0) return;
    const first = targets[0];
    if (targets.length === 1 && first) {
        map.setView([first.latitude, first.longitude], FOCUS_ZOOM);
        return;
    }
    map.fitBounds(L.latLngBounds(targets.map((t): L.LatLngTuple => [t.latitude, t.longitude])), {
        padding: [30, 30],
        maxZoom: MAX_FIT_ZOOM,
    });
}

export default function PointMap({
    points,
    reference,
    viewTargets,
    selection,
    searchActive,
    resultCount,
    onSelect,
}: PointMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerRef = useRef<L.LayerGroup | null>(null);
    const drawRef = useRef<() => void>(() => undefined);
    const latest = useRef({ points, reference, selection, searchActive, resultCount, onSelect });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const map = L.map(container, { zoomControl: false, center: JOINVILLE_VIEW, zoom: 12 });
        L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
        const layer = L.layerGroup().addTo(map);
        mapRef.current = map;
        layerRef.current = layer;

        const redraw = () => {
            drawRef.current();
        };
        map.on('zoomend moveend resize', redraw);
        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(() => {
                      map.invalidateSize();
                  });
        observer?.observe(container);
        return () => {
            observer?.disconnect();
            map.off('zoomend moveend resize', redraw);
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, []);

    const draw = () => {
        const map = mapRef.current;
        const layer = layerRef.current;
        if (!map || !layer) return;
        layer.clearLayers();

        const current = latest.current;
        const radius =
            current.searchActive && current.resultCount <= 30
                ? CLUSTER_RADIUS_FEW_RESULTS
                : CLUSTER_RADIUS;
        const selectedId = current.selection?.id ?? null;

        interface Group {
            x: number;
            y: number;
            members: CollectionPoint[];
        }
        const groups: Group[] = [];
        for (const point of current.points) {
            if (point.id === selectedId) continue;
            const { x, y } = map.latLngToContainerPoint([point.latitude, point.longitude]);
            const near =
                map.getZoom() >= NO_CLUSTER_ZOOM
                    ? undefined
                    : groups.find((group) => Math.hypot(group.x - x, group.y - y) < radius);
            if (near) {
                near.members.push(point);
                near.x = (near.x * (near.members.length - 1) + x) / near.members.length;
                near.y = (near.y * (near.members.length - 1) + y) / near.members.length;
            } else {
                groups.push({ x, y, members: [point] });
            }
        }

        const addPin = (point: CollectionPoint, isSelected: boolean) => {
            const kind = isSelected
                ? 'selected'
                : point.locationPrecision === 'NEIGHBORHOOD'
                  ? 'approximate'
                  : 'normal';
            const label = `${point.name}, bairro ${point.neighborhood}`;
            const marker = L.marker([point.latitude, point.longitude], {
                icon: pinIcon(kind),
                title: label,
                keyboard: true,
                zIndexOffset: isSelected ? 1000 : 0,
            });
            marker.on('click', () => {
                latest.current.onSelect(point, 'map');
            });
            marker.on('add', () => {
                marker.getElement()?.setAttribute('aria-label', label);
            });
            marker.addTo(layer);
        };

        for (const group of groups) {
            const [only] = group.members;
            if (group.members.length === 1 && only) {
                addPin(only, false);
                continue;
            }
            const lat =
                group.members.reduce((sum, p) => sum + p.latitude, 0) / group.members.length;
            const lon =
                group.members.reduce((sum, p) => sum + p.longitude, 0) / group.members.length;
            const label = `${group.members.length} pontos aqui, aproximar o mapa`;
            const marker = L.marker([lat, lon], {
                icon: clusterIcon(group.members.length),
                title: label,
            });
            marker.on('click', () => {
                fitTo(map, group.members);
            });
            marker.on('add', () => {
                marker.getElement()?.setAttribute('aria-label', label);
            });
            marker.addTo(layer);
        }

        const selected = current.points.find((point) => point.id === selectedId);
        if (selected) addPin(selected, true);

        if (current.reference) {
            const accuracy = current.reference.accuracyMeters;
            if (current.reference.kind === 'geolocation' && accuracy && accuracy > 0) {
                L.circle([current.reference.latitude, current.reference.longitude], {
                    radius: accuracy,
                    color: '#1a5fd0',
                    weight: 1,
                    fillColor: '#1a5fd0',
                    fillOpacity: 0.1,
                    interactive: false,
                }).addTo(layer);
            }
            const meLabel = current.reference.kind === 'geolocation' ? 'Você' : 'Partida';
            L.marker([current.reference.latitude, current.reference.longitude], {
                icon: meIcon(meLabel),
                interactive: false,
                keyboard: false,
                zIndexOffset: 2000,
            }).addTo(layer);
        }
    };

    useLayoutEffect(() => {
        latest.current = { points, reference, selection, searchActive, resultCount, onSelect };
        drawRef.current = draw;
    });

    useEffect(() => {
        drawRef.current();
    }, [points, reference, selection, searchActive, resultCount]);

    useEffect(() => {
        const map = mapRef.current;
        if (map) fitTo(map, viewTargets);
    }, [viewTargets]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || selection?.source !== 'list') return;
        const point = latest.current.points.find((item) => item.id === selection.id);
        if (point)
            map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), FOCUS_ZOOM));
    }, [selection]);

    const showAll = () => {
        const map = mapRef.current;
        if (map)
            fitTo(
                map,
                latest.current.points.filter((point) => !point.outsideMainArea),
            );
    };

    return (
        <>
            <div
                ref={containerRef}
                className={styles['mapBox']}
                role="region"
                aria-label="Mapa de Joinville com os pontos de coleta. A lista ao lado tem os mesmos pontos."
            />
            <div className={styles['mapControls']}>
                <button
                    type="button"
                    className={buttonClass({ variant: 'line' })}
                    onClick={() => mapRef.current?.zoomIn()}
                >
                    Aproximar
                </button>
                <button
                    type="button"
                    className={buttonClass({ variant: 'line' })}
                    onClick={() => mapRef.current?.zoomOut()}
                >
                    Afastar
                </button>
                <button
                    type="button"
                    className={buttonClass({ variant: 'line' })}
                    onClick={showAll}
                >
                    Ver tudo
                </button>
            </div>
        </>
    );
}
