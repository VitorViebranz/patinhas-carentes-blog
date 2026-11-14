import { normalizeText, parseCoordinates, type LatLon } from '@patinhas/shared';
import { Suspense, lazy, useMemo, useState, type FormEvent } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { StateMessage } from '../../components/state-message/StateMessage';
import { ApiError } from '../../services/api/client';
import {
    useCreateNeighborhood,
    useGeocodePreview,
    useNeighborhoodFromPostalCode,
    useSavePoint,
} from '../../services/api/admin';
import { useLookupPostalCode } from '../../services/api/public';
import type { AdminPoint, PointInput } from '../../services/api/admin-types';
import type { Neighborhood, PointCategory, PostalAddress } from '../../services/api/types';
import styles from '../admin.module.css';
import { CATEGORY_LABEL } from '../labels';
import { AdminInput, AdminSelect } from './AdminField';
import { NeighborhoodPicker } from './NeighborhoodPicker';
import { useToast } from './Toast';

const LocationPicker = lazy(() => import('./LocationPicker'));

type PinSource = 'none' | 'saved' | 'approximate' | 'geocoded' | 'manual';

interface Pin {
    position: LatLon | null;
    source: PinSource;
    precision?: 'HOUSE_NUMBER' | 'STREET' | 'PLACE_NAME';
}

export function splitAddress(address: string | null): { street: string; number: string } {
    const text = (address ?? '').trim();
    const match = /^(.*?)[,\s]+(\d[\w/-]*|s\/n)$/i.exec(text);
    if (!match) return { street: text, number: '' };
    return { street: (match[1] ?? '').trim(), number: match[2] ?? '' };
}

export function joinAddress(street: string, number: string): string {
    const base = street.trim();
    const house = number.trim();
    if (!base) return '';
    return house ? `${base}, ${house}` : base;
}

export function maskPostalCode(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export interface PointPrefill {
    name: string;
    phone: string;
    postalCode: string;
    address: string;
    neighborhoodName: string;
}

interface PointFormProps {
    point: AdminPoint | null;
    prefill?: PointPrefill | undefined;
    neighborhoods: Neighborhood[];
    onClose: () => void;
}

interface Errors {
    name?: string | undefined;
    neighborhoodId?: string | undefined;
    street?: string | undefined;
    coordinates?: string | undefined;
}

const CITY_CENTER: LatLon = { latitude: -26.3045, longitude: -48.8487 };

function missingNeighborhoodText(error: unknown, found: PostalAddress): string {
    const base = `CEP encontrado (${found.street}, ${found.neighborhood})`;
    const code = error instanceof ApiError ? error.code : '';
    if (code === 'POSTAL_CODE_OTHER_CITY') {
        return `${base}, mas é de ${found.city}. Escolha na lista o bairro de Joinville mais próximo.`;
    }
    if (code === 'NEIGHBORHOOD_NOT_LOCATED') {
        return `${base}, mas não consegui achar esse bairro no mapa. Escolha na lista o bairro mais próximo.`;
    }
    return `${base}, mas o bairro não está na lista. Escolha o bairro à mão.`;
}

export function PointForm({ point, prefill, neighborhoods, onClose }: PointFormProps) {
    const toast = useToast();
    const save = useSavePoint();
    const lookup = useLookupPostalCode();
    const preview = useGeocodePreview();
    const resolveNeighborhood = useNeighborhoodFromPostalCode();
    const createNeighborhood = useCreateNeighborhood();
    const [added, setAdded] = useState<Neighborhood[]>([]);
    const options = useMemo(
        () =>
            [
                ...neighborhoods,
                ...added.filter((item) => !neighborhoods.some((n) => n.id === item.id)),
            ].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        [neighborhoods, added],
    );

    const initial = splitAddress(point?.address ?? prefill?.address ?? null);
    const [name, setName] = useState(point?.name ?? prefill?.name ?? '');
    const [postalCode, setPostalCode] = useState(prefill?.postalCode ?? '');
    const [street, setStreet] = useState(initial.street);
    const [number, setNumber] = useState(initial.number);
    const [neighborhoodId, setNeighborhoodId] = useState(
        point?.neighborhoodId ??
            neighborhoods.find(
                (item) =>
                    prefill !== undefined &&
                    normalizeText(item.name) === normalizeText(prefill.neighborhoodName),
            )?.id ??
            '',
    );
    const [phone, setPhone] = useState(point?.phone ?? prefill?.phone ?? '');
    const [category, setCategory] = useState<PointCategory>(point?.category ?? 'COMMERCE_SERVICES');
    const [openingHours, setOpeningHours] = useState(point?.openingHours ?? '');
    const [coordinates, setCoordinates] = useState('');
    const [pin, setPin] = useState<Pin>(
        point
            ? {
                  position: { latitude: point.latitude, longitude: point.longitude },
                  source: point.locationPrecision === 'NEIGHBORHOOD' ? 'approximate' : 'saved',
              }
            : { position: null, source: 'none' },
    );
    const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
    const [errors, setErrors] = useState<Errors>({});
    const [savedId, setSavedId] = useState<string | null>(point?.id ?? null);
    const [warning, setWarning] = useState<string | null>(null);
    const [dirty, setDirty] = useState(prefill !== undefined);
    const [askingToClose, setAskingToClose] = useState(false);
    const requestClose = () => (dirty ? setAskingToClose(true) : onClose());

    const hood = options.find((item) => item.id === neighborhoodId);
    const center: LatLon = hood
        ? { latitude: hood.latitude, longitude: hood.longitude }
        : CITY_CENTER;

    function registerNeighborhoodByName(name: string) {
        createNeighborhood.mutate(name, {
            onSuccess: ({ created, neighborhood }) => {
                setAdded((current) => [...current, neighborhood]);
                setNeighborhoodId(neighborhood.id);
                setDirty(true);
                setMessage({
                    tone: 'ok',
                    text: created
                        ? `Bairro ${neighborhood.name} cadastrado agora e já selecionado.`
                        : `Bairro ${neighborhood.name} selecionado.`,
                });
                setErrors((current) => ({ ...current, neighborhoodId: undefined }));
            },
            onError: (error) =>
                setMessage({
                    tone: 'warn',
                    text:
                        error instanceof ApiError && error.code === 'NEIGHBORHOOD_NOT_LOCATED'
                            ? 'Não achei esse bairro no mapa de Joinville. Confira o nome.'
                            : 'Não foi possível cadastrar o bairro agora.',
                }),
        });
    }

    function registerNeighborhoodFromPostalCode(digits: string, found: PostalAddress) {
        resolveNeighborhood.mutate(digits, {
            onSuccess: ({ created, neighborhood }) => {
                setAdded((current) => [...current, neighborhood]);
                setNeighborhoodId(neighborhood.id);
                setMessage({
                    tone: 'ok',
                    text: created
                        ? `CEP encontrado: ${found.street}, ${neighborhood.name}. Esse bairro ainda não estava na lista e foi cadastrado agora. Informe o número.`
                        : `CEP encontrado: ${found.street}, ${neighborhood.name}. Agora informe o número.`,
                });
                setErrors((current) => ({ ...current, neighborhoodId: undefined }));
            },
            onError: (error) =>
                setMessage({ tone: 'warn', text: missingNeighborhoodText(error, found) }),
        });
    }

    function changePostalCode(value: string) {
        const masked = maskPostalCode(value);
        setPostalCode(masked);
        const digits = masked.replace(/\D/g, '');
        if (digits.length !== 8) return;
        lookup.mutate(digits, {
            onSuccess: (found) => {
                if (found.street) setStreet(found.street);
                const match = options.find(
                    (item) => normalizeText(item.name) === normalizeText(found.neighborhood),
                );
                if (match) setNeighborhoodId(match.id);
                setMessage(
                    match
                        ? {
                              tone: 'ok',
                              text: `CEP encontrado: ${found.street}, ${found.neighborhood}. Agora informe o número.`,
                          }
                        : { tone: 'ok', text: 'CEP encontrado. Conferindo o bairro...' },
                );
                setErrors((current) => ({
                    ...current,
                    street: undefined,
                    neighborhoodId: undefined,
                }));
                if (!match) registerNeighborhoodFromPostalCode(digits, found);
            },
            onError: () =>
                setMessage({
                    tone: 'warn',
                    text: 'CEP não encontrado. Preencha a rua à mão.',
                }),
        });
    }

    function locate() {
        const found: Errors = {};
        if (!street.trim()) found.street = 'Escreva a rua para localizar no mapa.';
        if (!neighborhoodId) found.neighborhoodId = 'Escolha o bairro.';
        setErrors((current) => ({ ...current, ...found }));
        if (Object.keys(found).length > 0) return;
        preview.mutate(
            { address: joinAddress(street, number), neighborhoodId },
            {
                onSuccess: (result) => {
                    const position = { latitude: result.latitude, longitude: result.longitude };
                    if (result.found) {
                        setPin({
                            position,
                            source: 'geocoded',
                            precision: number.trim() ? 'HOUSE_NUMBER' : 'STREET',
                        });
                        setMessage({
                            tone: 'ok',
                            text: 'Endereço encontrado. Confira o pino e arraste até a porta do local se precisar.',
                        });
                    } else {
                        setPin({ position, source: 'approximate' });
                        setMessage({
                            tone: 'warn',
                            text: 'Não achei esse endereço. O pino está no centro do bairro: clique no mapa ou arraste o pino até o local certo.',
                        });
                    }
                },
                onError: () =>
                    setMessage({
                        tone: 'warn',
                        text: 'Não foi possível buscar agora. Posicione o pino à mão no mapa.',
                    }),
            },
        );
    }

    function movePin(position: LatLon) {
        setDirty(true);
        setPin({ position, source: 'manual', precision: 'HOUSE_NUMBER' });
        setMessage({ tone: 'ok', text: 'Posição ajustada à mão. Ela será salva como exata.' });
    }

    function pasteCoordinates(value: string) {
        setCoordinates(value);
        const parsed = value.trim() ? parseCoordinates(value) : null;
        if (parsed) movePin(parsed);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        const found: Errors = {};
        if (!name.trim()) found.name = 'Escreva o nome do local.';
        if (!neighborhoodId) found.neighborhoodId = 'Escolha o bairro.';
        if (number.trim() && !street.trim()) found.street = 'Escreva a rua do número informado.';
        if (coordinates.trim() && !parseCoordinates(coordinates)) {
            found.coordinates =
                'Não entendi as coordenadas. Cole algo como -26.2801, -48.8402 (dentro de Joinville e região).';
        }
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        const exact = pin.position && (pin.source === 'geocoded' || pin.source === 'manual');
        const data: PointInput = {
            name: name.trim(),
            neighborhoodId,
            address: joinAddress(street, number),
            phone: phone.trim(),
            category,
            openingHours: openingHours.trim(),
            ...(exact && pin.position
                ? { ...pin.position, locationPrecision: pin.precision ?? 'HOUSE_NUMBER' }
                : {}),
        };
        save.mutate(
            { ...(savedId ? { id: savedId } : {}), data },
            {
                onSuccess: (saved) => {
                    if (saved.locationSource === 'neighborhood-fallback') {
                        setSavedId(saved.id);
                        setPin({
                            position: { latitude: saved.latitude, longitude: saved.longitude },
                            source: 'approximate',
                        });
                        setWarning(
                            'Ponto salvo, mas não achei esse endereço no mapa, então ele ficou na posição do bairro. Confira a rua, ou arraste o pino até o local certo e salve de novo.',
                        );
                        return;
                    }
                    toast('Ponto salvo. Já aparece no mapa do site.');
                    onClose();
                },
            },
        );
    }

    const error =
        save.error instanceof ApiError
            ? save.error.status === 429
                ? 'Muitas buscas de endereço. Espere um pouco e tente de novo.'
                : 'Confira os dados e tente de novo.'
            : save.error
              ? 'Não foi possível salvar agora.'
              : null;

    const pinNote =
        pin.source === 'approximate'
            ? 'Posição aproximada pelo bairro.'
            : pin.source === 'none'
              ? 'Ainda sem posição. Use "Localizar no mapa".'
              : pin.source === 'saved'
                ? 'Posição salva.'
                : 'Posição exata.';

    return (
        <>
            <form
                className={styles['card']}
                onSubmit={submit}
                onChange={() => setDirty(true)}
                noValidate
            >
                <div className={styles['cardHead']}>
                    <h2>{point ? 'Editar ponto de coleta' : 'Novo ponto de coleta'}</h2>
                    <button className={styles['link']} type="button" onClick={requestClose}>
                        Fechar
                    </button>
                </div>
                {error ? (
                    <p className={styles['alert']} role="alert">
                        {error}
                    </p>
                ) : null}

                <div className={styles['fgrid']}>
                    <AdminInput
                        label="Nome do local"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Farmácia Vida"
                        error={errors.name}
                    />
                    <AdminInput
                        label="CEP"
                        value={postalCode}
                        onChange={(e) => changePostalCode(e.target.value)}
                        placeholder="00000-000"
                        inputMode="numeric"
                        hint={
                            lookup.isPending
                                ? 'Buscando o CEP...'
                                : 'Preenche a rua e o bairro sozinho (opcional).'
                        }
                    />
                    <AdminInput
                        label="Rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Ex.: Rua Afonso Frederico Leopoldo"
                        error={errors.street}
                    />
                    <AdminInput
                        label="Número"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Ex.: 60 ou s/n"
                    />
                    <NeighborhoodPicker
                        label="Bairro"
                        neighborhoods={options}
                        value={neighborhoodId}
                        onChange={(id) => {
                            setNeighborhoodId(id);
                            setDirty(true);
                        }}
                        onCreate={registerNeighborhoodByName}
                        creating={createNeighborhood.isPending}
                        error={errors.neighborhoodId}
                        hint="Não achou? Digite o nome e escolha Cadastrar."
                    />
                    <AdminInput
                        label="Telefone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(47) 00000 0000"
                        inputMode="tel"
                    />
                    <AdminSelect
                        label="Tipo de local"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as PointCategory)}
                    >
                        {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </AdminSelect>
                    <AdminInput
                        label="Horário (opcional)"
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                        placeholder="Ex.: seg a sex, 8h às 18h"
                    />
                </div>

                <div className={styles['placeStatus']}>
                    <b>Posição no mapa</b>
                    <button
                        className={`${styles['btn']} ${styles['ghost']} ${styles['sm']}`}
                        type="button"
                        disabled={preview.isPending}
                        onClick={locate}
                    >
                        {preview.isPending ? 'Procurando...' : 'Localizar no mapa'}
                    </button>
                </div>
                {message ? (
                    <p
                        className={
                            message.tone === 'ok' ? styles['statusOk'] : styles['statusWarn']
                        }
                        role="status"
                    >
                        {message.text}
                    </p>
                ) : null}
                <Suspense
                    fallback={<StateMessage kind="loading">Carregando o mapa...</StateMessage>}
                >
                    <LocationPicker position={pin.position} center={center} onChange={movePin} />
                </Suspense>
                <p className={`${styles['muted']} ${styles['gapTop8']}`}>
                    {pinNote} Clique no mapa ou arraste o pino para ajustar. O que você deixar no
                    mapa é o que o site mostra e o que o botão &quot;Como chegar&quot; usa.
                </p>

                <div className={`${styles['fgrid']} ${styles['one']} ${styles['gapTop14']}`}>
                    <AdminInput
                        label="Colar coordenadas ou link do Google Maps (opcional)"
                        value={coordinates}
                        onChange={(e) => pasteCoordinates(e.target.value)}
                        placeholder="-26.2801, -48.8402"
                        error={errors.coordinates}
                    />
                </div>
                {warning ? (
                    <p className={`${styles['alert']} ${styles['gapTop12']}`} role="alert">
                        {warning}
                    </p>
                ) : null}
                <div className={styles['actions']}>
                    <button className={styles['btn']} type="submit" disabled={save.isPending}>
                        {save.isPending ? 'Salvando...' : 'Salvar ponto'}
                    </button>
                    <button
                        className={`${styles['btn']} ${styles['ghost']}`}
                        type="button"
                        onClick={requestClose}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
            {askingToClose ? (
                <ConfirmDialog
                    title="Descartar as alterações?"
                    message="O que você preencheu neste ponto ainda não foi salvo."
                    confirmLabel="Descartar"
                    cancelLabel="Continuar editando"
                    onCancel={() => setAskingToClose(false)}
                    onConfirm={onClose}
                />
            ) : null}
        </>
    );
}
