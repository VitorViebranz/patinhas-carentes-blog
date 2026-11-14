import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminSettings } from '../../services/api/admin-types';
import { SETTING_GROUPS, type SettingField } from '../settings-fields';
import { SettingRow } from './SettingRow';

const data: AdminSettings = {
    gramsPerCap: 2.5,
    kgPriceBrl: 2,
    spayCostBrl: 350,
    vaccineDoseCostBrl: 60,
    kgPer100LBag: 20,
    doseGoalKg: 30,
    goalKg: 175,
    monthlyAverageKg: 0,
    animalsServedYear: null,
    cnpj: null,
    pixKey: null,
    whatsappNumber: '5547991457757',
    instagramHandle: null,
    adoptionUrl: null,
    hiddenFeatures: [],
    updatedAt: '2026-10-27T00:00:00.000Z',
};

const whatsapp: SettingField = SETTING_GROUPS.flatMap((group) => group.fields).find(
    (item) => item.id === 'whatsappNumber',
) as SettingField;

function renderRow() {
    const fetchMock = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(data), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <SettingRow field={whatsapp} data={data} />
        </QueryClientProvider>,
    );
    return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('SettingRow', () => {
    it('shows no save button until the value is edited', async () => {
        renderRow();

        expect(screen.queryByText('Salvo')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();

        await userEvent.type(screen.getByLabelText('WhatsApp (com DDI)'), '0');

        expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    });

    it('sends only the edited field to the API', async () => {
        const fetchMock = renderRow();
        const input = screen.getByLabelText('WhatsApp (com DDI)');

        await userEvent.clear(input);
        await userEvent.type(input, '5547988887777');
        await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('/api/v1/admin/site-settings');
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(String(init.body))).toEqual({ whatsappNumber: '5547988887777' });
        expect(await screen.findByText('Salvo')).toBeInTheDocument();
    });

    it('explains an invalid value and does not call the API', async () => {
        const fetchMock = renderRow();
        const input = screen.getByLabelText('WhatsApp (com DDI)');

        await userEvent.clear(input);
        await userEvent.type(input, '123');
        await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

        expect(await screen.findByText(/Use só números, com DDI e DDD/)).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('puts the saved value back when the edit is undone', async () => {
        renderRow();
        const input = screen.getByLabelText('WhatsApp (com DDI)');

        await userEvent.type(input, '99');
        await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));

        expect(input).toHaveValue('5547991457757');
        expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    });
});
