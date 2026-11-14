import { useState, type FormEvent } from 'react';
import { buttonClass } from '../../components/button/Button';
import { ConsentField, FormStatus, Honeypot, TextField } from '../../components/form/form-parts';
import pageStyles from '../../pages/shared/page.module.css';
import { isValidContact } from '../../lib/validation';
import { useLookupPostalCode, useSendHelpRequest } from '../../services/api/public';
import type { HelpRequestInput } from '../../services/api/types';
import { requestErrorMessage } from './submit';

const TYPES = [
    { value: 'SCHOOL', label: 'Escola' },
    { value: 'COMPANY', label: 'Empresa' },
    { value: 'STORE', label: 'Comércio' },
    { value: 'CONDO', label: 'Condomínio' },
] as const;

type Errors = Partial<Record<'name' | 'contact' | 'space' | 'street' | 'consent', string>>;

function maskPostalCode(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function SpaceRequestForm() {
    const send = useSendHelpRequest();
    const lookup = useLookupPostalCode();
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [space, setSpace] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [kind, setKind] = useState<(typeof TYPES)[number]['value']>('SCHOOL');
    const [wantsTalk, setWantsTalk] = useState(false);
    const [consent, setConsent] = useState(false);
    const [trap, setTrap] = useState('');
    const [errors, setErrors] = useState<Errors>({});

    function changePostalCode(value: string) {
        const masked = maskPostalCode(value);
        setPostalCode(masked);
        const digits = masked.replace(/\D/g, '');
        if (digits.length !== 8) return;
        lookup.mutate(digits, {
            onSuccess: (found) => {
                if (found.street) setStreet(found.street);
                if (found.neighborhood) setNeighborhood(found.neighborhood);
            },
        });
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        const found: Errors = {};
        if (name.trim().length < 2) found.name = 'Escreva o seu nome.';
        if (!isValidContact(contact)) found.contact = 'Escreva um WhatsApp com DDD ou um e-mail.';
        if (space.trim().length < 2) found.space = 'Escreva o nome do espaço.';
        if (street.trim().length < 3) found.street = 'Escreva a rua do espaço.';
        if (!consent) found.consent = 'Marque a caixa para enviar.';
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        const address = [street.trim(), number.trim()].filter(Boolean).join(', ');
        const input: HelpRequestInput = {
            type: 'COLLECTION_POINT',
            requesterName: name.trim(),
            contact: contact.trim(),
            institutionName: space.trim(),
            institutionType: kind,
            wantsTalk,
            address,
            ...(postalCode.length === 9 ? { postalCode } : {}),
            ...(neighborhood.trim() ? { neighborhoodName: neighborhood.trim() } : {}),
            consent: true,
            ...(trap ? { website: trap } : {}),
        };
        send.mutate(input);
    }

    if (send.isSuccess) {
        return (
            <div className={pageStyles['formCard']}>
                <FormStatus ok="Pedido enviado. A equipe responde pelo WhatsApp ou e-mail que você informou, normalmente em até 2 horas." />
            </div>
        );
    }

    return (
        <form className={pageStyles['formCard']} onSubmit={submit} noValidate>
            <div className={pageStyles['formGroup']}>
                <div className={pageStyles['formGrid']}>
                    <h3 className={pageStyles['formGroupTitle']}>Sobre você</h3>
                    <TextField
                        label="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={errors.name}
                        autoComplete="name"
                    />
                    <TextField
                        label="Seu WhatsApp ou e-mail"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        error={errors.contact}
                        inputMode="tel"
                        placeholder="(47) 90000 0000"
                        autoComplete="tel"
                    />
                </div>
            </div>
            <div className={pageStyles['formGroup']}>
                <div className={pageStyles['formGrid']}>
                    <h3 className={pageStyles['formGroupTitle']}>Sobre o espaço</h3>
                    <div className={pageStyles['formWide']}>
                        <TextField
                            label="Nome do espaço"
                            value={space}
                            onChange={(e) => setSpace(e.target.value)}
                            error={errors.space}
                        />
                    </div>
                    <fieldset className={`${pageStyles['field']} ${pageStyles['formWide']}`}>
                        <legend>O que é o seu espaço?</legend>
                        <div className={pageStyles['radios']}>
                            {TYPES.map((item) => (
                                <label key={item.value}>
                                    <input
                                        type="radio"
                                        name="tipo"
                                        checked={kind === item.value}
                                        onChange={() => setKind(item.value)}
                                    />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <TextField
                        label="CEP (preenche a rua sozinho)"
                        value={postalCode}
                        onChange={(e) => changePostalCode(e.target.value)}
                        inputMode="numeric"
                        placeholder="89200-000"
                        autoComplete="postal-code"
                    />
                    <TextField
                        label="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                    />
                    <TextField
                        label="Rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        error={errors.street}
                        autoComplete="street-address"
                    />
                    <TextField
                        label="Número"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        inputMode="numeric"
                    />
                </div>
            </div>
            <div className={pageStyles['formGroup']}>
                <label className={pageStyles['check']}>
                    <input
                        type="checkbox"
                        checked={wantsTalk}
                        onChange={(e) => setWantsTalk(e.target.checked)}
                    />
                    Quero também uma palestra
                </label>
                <ConsentField checked={consent} onChange={setConsent} error={errors.consent} />
                <Honeypot onChange={setTrap} />
                {send.isError ? <FormStatus error={requestErrorMessage(send.error)} /> : null}
                <button
                    className={buttonClass({ variant: 'teal', size: 'xl' })}
                    type="submit"
                    disabled={send.isPending}
                >
                    {send.isPending ? 'Enviando...' : 'Enviar pedido'}
                </button>
            </div>
        </form>
    );
}
