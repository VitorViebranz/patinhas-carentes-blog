import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError, apiRequest } from './client';
import type { Neighborhood } from './types';
import type {
    ReportFinance,
    AdminHelpRequest,
    AdminMedia,
    AdminPoint,
    AdminReport,
    AdminSettings,
    AdminStory,
    AdminUser,
    Dashboard,
    AdminPickup,
    GeocodePreview,
    Paged,
    PickupInput,
    PickupSummary,
    PointFilters,
    PointInput,
    Role,
    SessionUser,
    SettingsInput,
} from './admin-types';

const SESSION_KEY: QueryKey = ['session'];

export function useSession() {
    return useQuery({
        queryKey: SESSION_KEY,
        queryFn: async ({ signal }) => {
            try {
                return (await apiRequest<{ user: SessionUser }>('/auth/me', { signal })).user;
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) return null;
                throw error;
            }
        },
        staleTime: 60_000,
        retry: false,
    });
}

export function useLogin() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: async (input: { email: string; password: string }) =>
            (
                await apiRequest<{ user: SessionUser }>('/auth/login', {
                    method: 'POST',
                    body: input,
                })
            ).user,
        onSuccess: (user) => client.setQueryData(SESSION_KEY, user),
    });
}

export function useLogout() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
        onSettled: () => {
            client.setQueryData(SESSION_KEY, null);
            client.removeQueries({ predicate: (query) => query.queryKey[0] === 'admin' });
        },
    });
}

export function useDashboard() {
    return useQuery({
        queryKey: ['admin', 'dashboard'],
        queryFn: ({ signal }) => apiRequest<Dashboard>('/admin/dashboard', { signal }),
    });
}

function query(params: Record<string, string | number | boolean | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const text = search.toString();
    return text ? `?${text}` : '';
}

function useInvalidateAdmin() {
    const client = useQueryClient();
    return () => client.invalidateQueries({ queryKey: ['admin'] });
}

function useInvalidateAll() {
    const client = useQueryClient();
    return () => client.invalidateQueries();
}

export function useAdminPoints(filters: PointFilters) {
    return useQuery({
        queryKey: ['admin', 'points', filters],
        queryFn: ({ signal }) =>
            apiRequest<Paged<AdminPoint>>(
                `/admin/collection-points${query({ ...filters, pageSize: 20, status: 'ACTIVE' })}`,
                { signal },
            ),
        placeholderData: (previous) => previous,
    });
}

export function useSavePoint() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: {
            id?: string;
            data: Partial<PointInput> & { status?: 'ACTIVE' | 'INACTIVE' };
        }) =>
            input.id
                ? apiRequest<AdminPoint>(`/admin/collection-points/${input.id}`, {
                      method: 'PATCH',
                      body: input.data,
                  })
                : apiRequest<AdminPoint>('/admin/collection-points', {
                      method: 'POST',
                      body: input.data,
                  }),
        onSuccess: refresh,
    });
}

export function usePickupSummary() {
    return useQuery({
        queryKey: ['admin', 'pickups', 'summary'],
        queryFn: async ({ signal }) =>
            (await apiRequest<{ items: PickupSummary[] }>('/admin/pickups/summary', { signal }))
                .items,
    });
}

export function usePointPickups(pointId: string) {
    return useQuery({
        queryKey: ['admin', 'pickups', pointId],
        queryFn: async ({ signal }) =>
            (
                await apiRequest<Paged<AdminPickup>>(
                    `/admin/pickups${query({ pointId, pageSize: 5 })}`,
                    { signal },
                )
            ).items,
    });
}

export function useAllActivePoints() {
    return useQuery({
        queryKey: ['admin', 'points', 'all-active'],
        queryFn: async ({ signal }) => {
            const url = (page: number) =>
                `/admin/collection-points${query({ page, pageSize: 100, status: 'ACTIVE' })}`;
            const first = await apiRequest<Paged<AdminPoint>>(url(1), { signal });
            const items = [...first.items];
            for (let page = 2; page <= first.meta.totalPages; page += 1) {
                items.push(...(await apiRequest<Paged<AdminPoint>>(url(page), { signal })).items);
            }
            return items;
        },
    });
}

export function useRecentPickups() {
    return useQuery({
        queryKey: ['admin', 'pickups', 'recent'],
        queryFn: async ({ signal }) =>
            (
                await apiRequest<Paged<AdminPickup>>(`/admin/pickups${query({ pageSize: 10 })}`, {
                    signal,
                })
            ).items,
    });
}

export function useCreatePickup() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: PickupInput) =>
            apiRequest<AdminPickup>('/admin/pickups', { method: 'POST', body: input }),
        onSuccess: refresh,
    });
}

export function useDeletePickup() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (id: string) => apiRequest<void>(`/admin/pickups/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
}

export function useDeactivatePoint() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (id: string) =>
            apiRequest<void>(`/admin/collection-points/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
}

export function useGeocodePoint() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (id: string) =>
            apiRequest<AdminPoint>(`/admin/collection-points/${id}/geocode`, { method: 'POST' }),
        onSuccess: refresh,
    });
}

export function useAdminRequests(status: 'NEW' | 'ANSWERED' | undefined, page: number) {
    return useQuery({
        queryKey: ['admin', 'requests', status, page],
        queryFn: ({ signal }) =>
            apiRequest<Paged<AdminHelpRequest>>(
                `/admin/help-requests${query({ status, page, pageSize: 20 })}`,
                {
                    signal,
                },
            ),
        placeholderData: (previous) => previous,
    });
}

export function useSetRequestStatus() {
    const refresh = useInvalidateAdmin();
    return useMutation({
        mutationFn: (input: { id: string; status: 'NEW' | 'ANSWERED' }) =>
            apiRequest<AdminHelpRequest>(`/admin/help-requests/${input.id}`, {
                method: 'PATCH',
                body: { status: input.status },
            }),
        onSuccess: refresh,
    });
}

export function useDeleteRequest() {
    const refresh = useInvalidateAdmin();
    return useMutation({
        mutationFn: (id: string) =>
            apiRequest<void>(`/admin/help-requests/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
}

export function useAdminReports() {
    return useQuery({
        queryKey: ['admin', 'reports'],
        queryFn: async ({ signal }) =>
            (
                await apiRequest<Paged<AdminReport>>('/admin/monthly-reports?pageSize=100', {
                    signal,
                })
            ).items,
    });
}

export function useSaveReport() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: {
            id?: string;
            month: string;
            totalKg: number;
            outcomeSummary?: string;
            finance?: ReportFinance;
        }) =>
            input.id
                ? apiRequest<AdminReport>(`/admin/monthly-reports/${input.id}`, {
                      method: 'PATCH',
                      body: {
                          totalKg: input.totalKg,
                          outcomeSummary: input.outcomeSummary ?? '',
                          ...input.finance,
                      },
                  })
                : apiRequest<AdminReport>('/admin/monthly-reports', {
                      method: 'POST',
                      body: {
                          month: input.month,
                          totalKg: input.totalKg,
                          ...input.finance,
                          ...(input.outcomeSummary ? { outcomeSummary: input.outcomeSummary } : {}),
                      },
                  }),
        onSuccess: refresh,
    });
}

export function usePublishReport() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: { id: string; publish: boolean }) =>
            apiRequest<AdminReport>(
                `/admin/monthly-reports/${input.id}/${input.publish ? 'publish' : 'unpublish'}`,
                {
                    method: 'POST',
                },
            ),
        onSuccess: refresh,
    });
}

export function useAdminStories() {
    return useQuery({
        queryKey: ['admin', 'stories'],
        queryFn: async ({ signal }) =>
            (await apiRequest<Paged<AdminStory>>('/admin/stories?pageSize=100', { signal })).items,
    });
}

export function useSaveStory() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: {
            id?: string;
            title: string;
            body: string;
            coverMediaId?: string | null;
        }) => {
            const { id, ...data } = input;
            return id
                ? apiRequest<AdminStory>(`/admin/stories/${id}`, { method: 'PATCH', body: data })
                : apiRequest<AdminStory>('/admin/stories', { method: 'POST', body: data });
        },
        onSuccess: refresh,
    });
}

export function usePublishStory() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: { id: string; publish: boolean }) =>
            apiRequest<AdminStory>(
                `/admin/stories/${input.id}/${input.publish ? 'publish' : 'unpublish'}`,
                {
                    method: 'POST',
                },
            ),
        onSuccess: refresh,
    });
}

export function useDeleteStory() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (id: string) => apiRequest<void>(`/admin/stories/${id}`, { method: 'DELETE' }),
        onSuccess: refresh,
    });
}

export function useUploadMedia() {
    return useMutation({
        mutationFn: (input: { file: File; altText: string }) => {
            const formData = new FormData();
            formData.append('altText', input.altText);
            formData.append('file', input.file);
            return apiRequest<AdminMedia>('/admin/media', { method: 'POST', formData });
        },
    });
}

export function useAdminUsers() {
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: async ({ signal }) =>
            (await apiRequest<Paged<AdminUser>>('/admin/users?pageSize=100', { signal })).items,
    });
}

export function useCreateUser() {
    const refresh = useInvalidateAdmin();
    return useMutation({
        mutationFn: (input: { name: string; email: string; password: string; role: Role }) =>
            apiRequest<AdminUser>('/admin/users', { method: 'POST', body: input }),
        onSuccess: refresh,
    });
}

export function useUpdateUser() {
    const refresh = useInvalidateAdmin();
    return useMutation({
        mutationFn: (input: { id: string; isActive?: boolean; role?: Role }) => {
            const { id, ...data } = input;
            return apiRequest<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: data });
        },
        onSuccess: refresh,
    });
}

export function useAdminSettings() {
    return useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: ({ signal }) => apiRequest<AdminSettings>('/admin/site-settings', { signal }),
    });
}

export function useSaveSettings() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (data: SettingsInput) =>
            apiRequest<AdminSettings>('/admin/site-settings', { method: 'PATCH', body: data }),
        onSuccess: refresh,
    });
}

export function useSetFeatureVisible() {
    const refresh = useInvalidateAll();
    return useMutation({
        mutationFn: (input: { key: string; visible: boolean }) =>
            apiRequest<{ key: string; visible: boolean; hiddenFeatures: string[] }>(
                `/admin/features/${input.key}`,
                { method: 'PUT', body: { visible: input.visible } },
            ),
        onSuccess: refresh,
    });
}

export function useNeighborhoodFromPostalCode() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (postalCode: string) =>
            apiRequest<{ created: boolean; neighborhood: Neighborhood }>(
                '/admin/neighborhoods/from-postal-code',
                { method: 'POST', body: { postalCode } },
            ),
        onSuccess: (result) => {
            if (result.created) void client.invalidateQueries({ queryKey: ['neighborhoods'] });
        },
    });
}

export function useCreateNeighborhood() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (name: string) =>
            apiRequest<{ created: boolean; neighborhood: Neighborhood }>('/admin/neighborhoods', {
                method: 'POST',
                body: { name },
            }),
        onSuccess: (result) => {
            if (result.created) void client.invalidateQueries({ queryKey: ['neighborhoods'] });
        },
    });
}

export function useGeocodePreview() {
    return useMutation({
        mutationFn: (input: { address: string; neighborhoodId: string }) =>
            apiRequest<GeocodePreview>('/admin/geocode-preview', { method: 'POST', body: input }),
    });
}
