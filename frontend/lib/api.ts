"use client";

import { ApiError, useApiClient } from "./api-client";
import type { CareerPath, CompleteStepResponse, MeResponse, OnboardingPayload, OnboardingResponse } from "./types";

export function useBackendApi() {
    const fetcher = useApiClient();

    async function getMe() {
        return fetcher<MeResponse>("/api/v1/me");
    }

    async function createOnboarding(payload: OnboardingPayload) {
        return fetcher<OnboardingResponse>("/api/v1/onboarding", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async function getMyCareerPath() {
        return fetcher<CareerPath>("/api/v1/career-paths/me");
    }

    async function getCareerPathById(careerPathId: string) {
        return fetcher<CareerPath>(`/api/v1/career-paths/${careerPathId}`);
    }

    async function completeStep(stepId: string) {
        return fetcher<CompleteStepResponse>(`/api/v1/path-steps/${stepId}/complete`, {
            method: "POST",
        });
    }

    return {
        getMe,
        createOnboarding,
        getMyCareerPath,
        getCareerPathById,
        completeStep,
    };
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
