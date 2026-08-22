"use client";

import useSWR from "swr";

import { isApiNotFound, useBackendApi } from "@/lib/api";
import type {
    CareerPath,
    DailySessionResponse,
    MeResponse,
    Note,
    OnboardingContextResponse,
    PaywallTeaserResponse,
    ProfileResponse,
    TrailTemplate,
} from "@/lib/types";

const DEDUPING_INTERVAL_MS = 10_000;

export const backendQueryKeys = {
    me: "/api/v1/me",
    myCareerPaths: "/api/v1/career-paths/me",
    profile: "/api/v1/profile",
    dailySession: "/api/v1/daily-session",
    notes: (query?: string) => `/api/v1/notes${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    trailTemplates: "/api/v1/trail-templates",
    latestOnboardingContext: "/api/v1/onboarding/context/latest",
    paywallTeaser: "/api/v1/onboarding/paywall/teaser",
    careerPathById: (careerPathId: string) => `/api/v1/career-paths/${careerPathId}`,
};

const sharedOptions = {
    dedupingInterval: DEDUPING_INTERVAL_MS,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
} as const;

type CareerPathsQueryOptions = {
    enabled?: boolean;
    notFoundAsEmpty?: boolean;
};

export function useMeQuery() {
    const api = useBackendApi();
    return useSWR<MeResponse>(backendQueryKeys.me, () => api.getMe(), sharedOptions);
}

export function useMyCareerPathsQuery(options: CareerPathsQueryOptions = {}) {
    const api = useBackendApi();
    const { enabled = true, notFoundAsEmpty = true } = options;
    return useSWR<CareerPath[]>(
        enabled ? backendQueryKeys.myCareerPaths : null,
        async () => {
            try {
                return await api.getMyCareerPaths();
            } catch (error) {
                if (notFoundAsEmpty && isApiNotFound(error)) {
                    return [];
                }
                throw error;
            }
        },
        sharedOptions,
    );
}

export function useProfileQuery() {
    const api = useBackendApi();
    return useSWR<ProfileResponse | null>(
        backendQueryKeys.profile,
        async () => {
            try {
                return await api.getProfile();
            } catch {
                return null;
            }
        },
        sharedOptions,
    );
}

export function useDailySessionQuery() {
    const api = useBackendApi();
    return useSWR<DailySessionResponse | null>(
        backendQueryKeys.dailySession,
        async () => {
            try {
                return await api.getDailySession();
            } catch {
                return null;
            }
        },
        sharedOptions,
    );
}

export function useNotesQuery(query?: string) {
    const api = useBackendApi();
    return useSWR<Note[]>(
        backendQueryKeys.notes(query),
        async () => {
            try {
                return await api.getNotes(query);
            } catch {
                return [];
            }
        },
        {
            ...sharedOptions,
            keepPreviousData: true,
        },
    );
}

export function useTrailTemplatesQuery() {
    const api = useBackendApi();
    return useSWR<TrailTemplate[]>(backendQueryKeys.trailTemplates, () => api.listTrailTemplates(), sharedOptions);
}

export function useLatestOnboardingContextQuery() {
    const api = useBackendApi();
    return useSWR<OnboardingContextResponse | null>(
        backendQueryKeys.latestOnboardingContext,
        async () => {
            try {
                return await api.getLatestOnboardingContext();
            } catch (error) {
                if (isApiNotFound(error)) {
                    return null;
                }
                throw error;
            }
        },
        sharedOptions,
    );
}

export function usePaywallTeaserQuery() {
    const api = useBackendApi();
    return useSWR<PaywallTeaserResponse | null>(
        backendQueryKeys.paywallTeaser,
        async () => {
            try {
                return await api.getPaywallTeaser();
            } catch {
                return null;
            }
        },
        sharedOptions,
    );
}

export function useCareerPathByIdQuery(careerPathId: string | null) {
    const api = useBackendApi();
    return useSWR<CareerPath>(
        careerPathId ? backendQueryKeys.careerPathById(careerPathId) : null,
        () => api.getCareerPathById(careerPathId as string),
        sharedOptions,
    );
}
