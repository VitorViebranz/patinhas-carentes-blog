import {
    isSearchActive,
    isTooFarFromJoinville,
    matchesSearch,
    rankByDistance,
    type LatLon,
} from '@patinhas/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CollectionPoint, Neighborhood } from '../../services/api/types';

const INITIAL_SHOWN = 8;
const SHOWN_STEP = 10;
const NEAREST_ON_MAP = 5;
const GEOLOCATION_ENTRY = { timeoutMs: 9000, maxAgeMs: 300_000 };
const GEOLOCATION_BUTTON = { timeoutMs: 15_000, maxAgeMs: 0 };
const ACCURACY_STEP_METERS = 10;

export interface Reference extends LatLon {
    label: string;
    kind: 'neighborhood' | 'geolocation';
    accuracyMeters?: number | undefined;
}

function locationLabel(accuracy: unknown): string {
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0) {
        return 'da sua localização';
    }
    const rounded = Math.max(
        ACCURACY_STEP_METERS,
        Math.round(accuracy / ACCURACY_STEP_METERS) * ACCURACY_STEP_METERS,
    );
    return `da sua localização (precisão de cerca de ${rounded} m)`;
}

export interface Selection {
    id: string;

    source: 'list' | 'map';
}

export interface FinderEntry {
    item: CollectionPoint;
    distanceMeters: number | null;
}

export const MESSAGES = {
    searching: 'Procurando onde você está... o navegador pode pedir permissão.',
    unsupported: 'Este aparelho não permite achar a sua localização. Escolha o seu bairro.',
    denied: 'Não consegui achar a sua localização. Libere o acesso no navegador ou escolha o seu bairro.',
    tooFar: 'Parece que você está longe de Joinville. Escolha o seu bairro.',
    noReference:
        'Use a sua localização ou escolha o bairro para ver os pontos do mais perto para o mais longe.',
} as const;

export interface PointFinder {
    reference: Reference | null;
    neighborhood: string;
    query: string;
    setQuery: (query: string) => void;
    searchActive: boolean;
    results: FinderEntry[];
    shown: number;
    showMore: () => void;
    selection: Selection | null;
    select: (point: CollectionPoint, source: Selection['source']) => void;
    clearSelection: () => void;
    chooseNeighborhood: (name: string) => void;
    locateMe: () => void;
    locating: boolean;

    statusLine: string;

    viewTargets: LatLon[];
}

function byName(a: CollectionPoint, b: CollectionPoint): number {
    return a.name.localeCompare(b.name, 'pt-BR');
}

export function usePointFinder(
    points: readonly CollectionPoint[],
    neighborhoods: readonly Neighborhood[],
): PointFinder {
    const [reference, setReference] = useState<Reference | null>(null);
    const [neighborhood, setNeighborhood] = useState('');
    const [query, setQueryState] = useState('');
    const [shown, setShown] = useState(INITIAL_SHOWN);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);
    const askedOnEntry = useRef(false);
    const chosenByHand = useRef(false);

    const entries = useMemo<FinderEntry[]>(
        () =>
            reference
                ? rankByDistance(points, reference)
                : [...points]
                      .sort(byName)
                      .map((item): FinderEntry => ({ item, distanceMeters: null })),
        [points, reference],
    );
    const searchActive = isSearchActive(query);
    const results = useMemo(
        () => entries.filter((entry) => matchesSearch(entry.item, query)),
        [entries, query],
    );

    const viewTargets = useMemo<LatLon[]>(() => {
        if (searchActive) return results.map((entry) => entry.item);
        if (!reference) return points.filter((point) => !point.outsideMainArea);
        return [reference, ...entries.slice(0, NEAREST_ON_MAP).map((entry) => entry.item)];
    }, [searchActive, results, entries, reference, points]);

    const setQuery = useCallback((value: string) => {
        setQueryState(value);
        setShown(INITIAL_SHOWN);
    }, []);

    const applyReference = useCallback((next: Reference, chosenNeighborhood: string) => {
        setReference(next);
        setNeighborhood(chosenNeighborhood);
        setShown(INITIAL_SHOWN);
        setMessage(null);
    }, []);

    const chooseNeighborhood = useCallback(
        (name: string) => {
            const anchor = neighborhoods.find((item) => item.name === name);
            if (!anchor) return;
            chosenByHand.current = true;
            const hasPoints = anchor.pointCount > 0;
            applyReference(
                {
                    latitude: anchor.latitude,
                    longitude: anchor.longitude,
                    label: `do bairro ${name}${hasPoints ? '' : ' (ainda sem ponto no bairro)'}`,
                    kind: 'neighborhood',
                },
                name,
            );
        },
        [neighborhoods, applyReference],
    );

    const requestLocation = useCallback(
        (onEntry: boolean) => {
            if (!('geolocation' in navigator)) {
                setMessage(onEntry ? null : MESSAGES.unsupported);
                return;
            }
            if (!onEntry) chosenByHand.current = false;
            setLocating(true);
            setMessage(MESSAGES.searching);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocating(false);
                    if (onEntry && chosenByHand.current) {
                        setMessage(null);
                        return;
                    }
                    const here: LatLon = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    if (isTooFarFromJoinville(rankByDistance(points, here))) {
                        setMessage(MESSAGES.tooFar);
                        return;
                    }
                    const accuracy: unknown = position.coords.accuracy;
                    applyReference(
                        {
                            ...here,
                            label: locationLabel(accuracy),
                            kind: 'geolocation',
                            accuracyMeters: typeof accuracy === 'number' ? accuracy : undefined,
                        },
                        '',
                    );
                },
                () => {
                    setLocating(false);
                    setMessage(onEntry ? null : MESSAGES.denied);
                },
                {
                    enableHighAccuracy: !onEntry,
                    timeout: (onEntry ? GEOLOCATION_ENTRY : GEOLOCATION_BUTTON).timeoutMs,
                    maximumAge: (onEntry ? GEOLOCATION_ENTRY : GEOLOCATION_BUTTON).maxAgeMs,
                },
            );
        },
        [points, applyReference],
    );

    const locateMe = useCallback(() => {
        requestLocation(false);
    }, [requestLocation]);

    useEffect(() => {
        if (askedOnEntry.current) return;
        askedOnEntry.current = true;
        requestLocation(true);
    }, [requestLocation]);

    const select = useCallback(
        (point: CollectionPoint, source: Selection['source']) => {
            setSelection({ id: point.id, source });

            const index = results.findIndex((entry) => entry.item.id === point.id);
            if (index >= 0) setShown((current) => Math.max(current, index + 1));
        },
        [results],
    );

    const clearSelection = useCallback(() => {
        setSelection(null);
    }, []);

    const showMore = useCallback(() => {
        setShown((current) => current + SHOWN_STEP);
    }, []);

    return {
        reference,
        neighborhood,
        query,
        setQuery,
        searchActive,
        results,
        shown,
        showMore,
        selection,
        select,
        clearSelection,
        chooseNeighborhood,
        locateMe,
        locating,
        statusLine:
            message ??
            (reference
                ? `Do mais perto para o mais longe, a partir ${reference.label}.`
                : MESSAGES.noReference),
        viewTargets,
    };
}
