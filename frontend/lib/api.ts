"use client";

import { useMemo } from "react";

import { ApiError, useApiClient } from "./api-client";
import type {
    AddedTrailTemplateResponse,
    CareerPath,
    CompleteStepResponse,
    DailySessionResponse,
    IdentityStatementResponse,
    LeaderboardEntry,
    MeResponse,
    Note,
    OnboardingDraftResponse,
    OnboardingContextResponse,
    OnboardingExploreResponse,
    OnboardingPayload,
    OnboardingResponse,
    PaywallTeaserResponse,
    ProfileResponse,
    TrailTemplate,
} from "./types";

export function useBackendApi() {
    const fetcher = useApiClient();

    return useMemo(() => ({
        async getMe() {
            return fetcher<MeResponse>("/api/v1/me");
        },

        async createOnboarding(payload: OnboardingPayload) {
            return fetcher<OnboardingResponse>("/api/v1/onboarding", {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },

        async upsertOnboardingDraft(payload: OnboardingPayload, onboardingId?: string | null) {
            const qs = onboardingId ? `?onboarding_id=${encodeURIComponent(onboardingId)}` : "";
            return fetcher<OnboardingDraftResponse>(`/api/v1/onboarding/draft${qs}`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },

        async exploreFromOnboarding(onboardingId: string) {
            return fetcher<OnboardingExploreResponse>(`/api/v1/onboarding/${onboardingId}/explore`, {
                method: "POST",
            });
        },

        async getLatestOnboardingContext() {
            return fetcher<OnboardingContextResponse>("/api/v1/onboarding/context/latest");
        },

        async getPaywallTeaser() {
            return fetcher<PaywallTeaserResponse>("/api/v1/onboarding/paywall/teaser");
        },

        async getIdentityStatement(onboardingId: string) {
            return fetcher<IdentityStatementResponse>(`/api/v1/onboarding/${onboardingId}/identity-statement`);
        },

        async regenerateIdentityStatement(onboardingId: string) {
            return fetcher<IdentityStatementResponse>(`/api/v1/onboarding/${onboardingId}/identity-statement`, {
                method: "POST",
            });
        },

        async getMyCareerPaths() {
            return fetcher<CareerPath[]>("/api/v1/career-paths/me");
        },

        async getCareerPathById(careerPathId: string) {
            return fetcher<CareerPath>(`/api/v1/career-paths/${careerPathId}`);
        },

        async listTrailTemplates() {
            return fetcher<TrailTemplate[]>("/api/v1/trail-templates");
        },

        async addTrailTemplate(templateId: string) {
            return fetcher<AddedTrailTemplateResponse>(`/api/v1/trail-templates/${templateId}/add`, {
                method: "POST",
            });
        },

        async completeStep(stepId: string, contentItemId?: string | null) {
            return fetcher<CompleteStepResponse>(`/api/v1/path-steps/${stepId}/complete`, {
                method: "POST",
                body: JSON.stringify({ content_item_id: contentItemId ?? null }),
            });
        },

        async getDailySession() {
            return fetcher<DailySessionResponse>("/api/v1/daily-session");
        },

        async completeDailyObjective(objectiveId: string) {
            return fetcher<{ current_streak: number; longest_streak: number }>("/api/v1/daily-session/complete", {
                method: "POST",
                body: JSON.stringify({ objective_id: objectiveId }),
            });
        },

        async getProfile() {
            return fetcher<ProfileResponse>("/api/v1/profile");
        },

        async getLeaderboard() {
            return fetcher<LeaderboardEntry[]>("/api/v1/leaderboard");
        },

        async getNotes(q?: string) {
            const qs = q ? `?q=${encodeURIComponent(q)}` : "";
            return fetcher<Note[]>(`/api/v1/notes${qs}`);
        },

        async getNoteByStep(stepId: string) {
            return fetcher<Note | null>(`/api/v1/notes/by-step/${stepId}`);
        },

        async upsertNoteByStep(stepId: string, content: string, title?: string) {
            return fetcher<Note>(`/api/v1/notes/by-step/${stepId}`, {
                method: "PUT",
                body: JSON.stringify({ content, title: title ?? null }),
            });
        },

        async createNote(content: string, title?: string) {
            return fetcher<Note>("/api/v1/notes", {
                method: "POST",
                body: JSON.stringify({ content, title: title ?? null }),
            });
        },

        async updateNote(noteId: string, content: string, title?: string) {
            return fetcher<Note>(`/api/v1/notes/${noteId}`, {
                method: "PATCH",
                body: JSON.stringify({ content, title: title ?? null }),
            });
        },

        async deleteNote(noteId: string) {
            return fetcher<void>(`/api/v1/notes/${noteId}`, { method: "DELETE" });
        },
    }), [fetcher]);
}

export function isApiNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.status === 404;
}

export function extractApiMessage(error: unknown, fallback: string): string {
    if (!(error instanceof ApiError)) {
        return fallback;
    }

    const body = error.body as { detail?: string } | string | null;
    if (typeof body === "string" && body.length > 0) {
        return body;
    }
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
        return body.detail;
    }

    return fallback;
}

export function extractOnboardingSubmitMessage(error: unknown): string {
    if (!(error instanceof ApiError)) {
        return "Nao foi possivel enviar seu onboarding.";
    }

    if (error.status === 401) {
        return "Sua sessao expirou. Entre novamente e tente mais uma vez.";
    }

    if (error.status === 429) {
        return "Voce atingiu o limite diario de geracoes. Tente novamente amanha.";
    }

    if (error.status === 503) {
        return "A fila de geracao esta indisponivel no momento. Tente novamente em instantes.";
    }

    const body = error.body as { detail?: string | Array<{ msg?: string; loc?: string[] }> } | null;
    if (error.status === 422 && body && typeof body === "object" && Array.isArray(body.detail)) {
        const messages = body.detail.map((item) => item.msg).filter((value): value is string => typeof value === "string");
        return messages.length > 0 ? messages.join(" ") : "Revise os campos do onboarding e tente novamente.";
    }

    return extractApiMessage(error, "Nao foi possivel enviar seu onboarding.");
}
