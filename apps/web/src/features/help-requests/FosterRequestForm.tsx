import { useState, type FormEvent } from 'react';
import { buttonClass } from '../../components/button/Button';
import { ConsentField, FormStatus, Honeypot, TextField } from '../../components/form/form-parts';
import pageStyles from '../../pages/shared/page.module.css';
import { isValidContact } from '../../lib/validation';
import { useSendHelpRequest } from '../../services/api/public';
import { requestErrorMessage } from './submit';

const CAPACITY = [
    { value: 1, label: '1 animal' },
    { value: 2, label: '2 animais' },
    { value: 3, label: '3 ou mais' },
];

type Errors = Partial<Record<'name' | 'contact' | 'consent', string>>;

export function FosterRequestForm() {
    const send = useSendHelpRequest();
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [capacity, setCapacity] = useState(1);
    const [consent, setConsent] = useState(false);
    const [trap, setTrap] = useState('');
    const [errors, setErrors] = useState<Errors>({});

    function submit(event: FormEvent) {
        event.preventDefault();
        const found: Errors = {};
        if (name.trim().length < 2) found.name = 'Escreva o seu nome.';
        if (!isValidContact(contact)) found.contact = 'Escreva um WhatsApp com DDD ou um e-mail.';
        if (!consent) found.consent = 'Marque a caixa para enviar.';
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        send.mutate({
            type: 'FOSTER',
            requesterName: name.trim(),
            contact: contact.trim(),
            animalCapacity: capacity,
            consent: true,
            ...(trap ? { website: trap } : {}),
        });
    }

    if (send.isSuccess) {
        return <FormStatus ok="Pedido enviado. A equipe chama você em breve." />;
    }

    return (
        <form onSubmit={submit} noValidate>
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
            <div className={pageStyles['field']}>
                <label htmlFor="capacity">Quantos animais você consegue receber?</label>
                <select
                    id="capacity"
                    className={pageStyles['select']}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                >
                    {CAPACITY.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>
            <ConsentField checked={consent} onChange={setConsent} error={errors.consent} />
            <Honeypot onChange={setTrap} />
            {send.isError ? <FormStatus error={requestErrorMessage(send.error)} /> : null}
            <button
                className={buttonClass({ variant: 'teal', size: 'xl' })}
                type="submit"
                disabled={send.isPending}
            >
                {send.isPending ? 'Enviando...' : 'Enviar'}
            </button>
        </form>
    );
}
