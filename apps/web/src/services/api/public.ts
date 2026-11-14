import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import type {
    CollectionPoint,
    HelpRequestInput,
    Leaderboard,
    LeaderboardPeriod,
    MonthlyReport,
    Neighborhood,
    PointImpact,
    PostalAddress,
    SiteSettings,
    StoryDetail,
    StorySummary,
} from './types';

const FIVE_MINUTES = 5 * 60_000;

export function useCollectionPoints() {
    return useQuery({
        queryKey: ['collection-points'],
        queryFn: async ({ signal }) =>
            (await apiRequest<{ items: CollectionPoint[] }>('/collection-points', { signal }))
                .items,
        staleTime: FIVE_MINUTES,
    });
}

export function useNeighborhoods() {
    return useQuery({
        queryKey: ['neighborhoods'],
        queryFn: async ({ signal }) =>
            (await apiRequest<{ items: Neighborhood[] }>('/neighborhoods', { signal })).items,
        staleTime: FIVE_MINUTES,
    });
}

export function useSiteSettings() {
    return useQuery({
        queryKey: ['site-settings'],
        queryFn: ({ signal }) => apiRequest<SiteSettings>('/site-settings', { signal }),
        staleTime: FIVE_MINUTES,
    });
}

export function useMonthlyReports() {
    return useQuery({
        queryKey: ['monthly-reports'],
        queryFn: async ({ signal }) =>
            (await apiRequest<{ items: MonthlyReport[] }>('/monthly-reports', { signal })).items,
        staleTime: FIVE_MINUTES,
    });
}

export function useLeaderboard(period: LeaderboardPeriod) {
    return useQuery({
        queryKey: ['leaderboard', period],
        queryFn: ({ signal }) =>
            apiRequest<Leaderboard>(`/leaderboard?period=${period}`, { signal }),
        staleTime: 60_000,
        placeholderData: (previous) => previous,
    });
}

export function usePointImpact(pointId: string) {
    return useQuery({
        queryKey: ['leaderboard', 'point', pointId],
        queryFn: ({ signal }) =>
            apiRequest<PointImpact>(`/leaderboard/points/${encodeURIComponent(pointId)}`, {
                signal,
            }),
        staleTime: 60_000,
        retry: false,
    });
}

export function useStories() {
    return useQuery({
        queryKey: ['stories'],
        queryFn: async ({ signal }) =>
            (await apiRequest<{ items: StorySummary[] }>('/stories', { signal })).items,
        staleTime: FIVE_MINUTES,
    });
}

export function useStory(slug: string) {
    return useQuery({
        queryKey: ['stories', slug],
        queryFn: ({ signal }) =>
            apiRequest<StoryDetail>(`/stories/${encodeURIComponent(slug)}`, { signal }),
        staleTime: FIVE_MINUTES,
        retry: false,
    });
}

export function useSendHelpRequest() {
    return useMutation({
        mutationFn: (input: HelpRequestInput) =>
            apiRequest<unknown>('/help-requests', { method: 'POST', body: input }),
    });
}

export function useLookupPostalCode() {
    return useMutation({
        mutationFn: (digits: string) => apiRequest<PostalAddress>(`/postal-codes/${digits}`),
    });
}
