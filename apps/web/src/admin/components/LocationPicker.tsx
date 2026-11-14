import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { LatLon } from '@patinhas/shared';
import styles from '../admin.module.css';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PIN_PATH = 'M0 0C-2-5-11-13-11-21A11 11 0 0 1 11-21C11-13 2-5 0 0Z';
const PIN_ZOOM = 18;
const PIN_WIDTH = 34;
const PIN_HEIGHT = 47;
const PIN_TIP_Y = (34 * PIN_HEIGHT) / 36;
const AREA_ZOOM = 14;

const pinIcon = L.divIcon({
    className: styles['pinHost'] ?? '',
    html: `<svg width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="-13 -34 26 36" aria-hidden="true"><path d="${PIN_PATH}" fill="#0A5753" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="-21" r="4.5" fill="#F5C84B"/></svg>`,
    iconSize: [PIN_WIDTH, PIN_HEIGHT],
    iconAnchor: [PIN_WIDTH / 2, PIN_TIP_Y],
});

interface LocationPickerProps {
    position: LatLon | null;
    center: LatLon;
    onChange: (position: LatLon) => void;
}

export default function LocationPicker({ position, center, onChange }: LocationPickerProps) {
    const host = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const marker = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);
    const ownMove = useRef<LatLon | null>(null);
    const emit = useRef((next: LatLon) => {
        ownMove.current = next;
        onChangeRef.current(next);
    });
    const startRef = useRef({ position, center });
    const pinLatitude = position?.latitude;
    const pinLongitude = position?.longitude;
    const centerLatitude = center.latitude;
    const centerLongitude = center.longitude;

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const element = host.current;
        if (!element) return undefined;
        const instance = L.map(element, { zoomControl: true, attributionControl: true });
        const start = startRef.current;
        const first = start.position ?? start.center;
        instance.setView([first.latitude, first.longitude], start.position ? PIN_ZOOM : AREA_ZOOM);
        L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(instance);
        instance.on('click', (event: L.LeafletMouseEvent) => {
            emit.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
        });
        map.current = instance;
        return () => {
            marker.current = null;
            map.current = null;
            instance.remove();
        };
    }, []);

    useEffect(() => {
        const instance = map.current;
        if (!instance) return;
        if (pinLatitude === undefined || pinLongitude === undefined) {
            marker.current?.remove();
            marker.current = null;
            instance.setView([centerLatitude, centerLongitude], AREA_ZOOM);
            return;
        }
        const target: L.LatLngTuple = [pinLatitude, pinLongitude];
        if (marker.current) {
            marker.current.setLatLng(target);
        } else {
            const created = L.marker(target, {
                icon: pinIcon,
                draggable: true,
                keyboard: false,
            }).addTo(instance);
            created.on('dragend', () => {
                const at = created.getLatLng();
                emit.current({ latitude: at.lat, longitude: at.lng });
            });
            marker.current = created;
        }
        const own = ownMove.current;
        if (own?.latitude === pinLatitude && own.longitude === pinLongitude) return;
        const zoom = instance.getZoom();
        instance.setView(target, Number.isFinite(zoom) ? Math.max(zoom, PIN_ZOOM) : PIN_ZOOM);
    }, [pinLatitude, pinLongitude, centerLatitude, centerLongitude]);

    return (
        <div
            ref={host}
            className={styles['pickerMap']}
            role="application"
            aria-label="Mapa para conferir e ajustar a posição do ponto"
        />
    );
}
