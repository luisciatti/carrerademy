"use client";

import { useCallback } from "react";

const API_BASE_URL = "/api/backend";

type ApiFetchOptions = RequestInit & {
    token?: string | null;
};

export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { headers, ...rest } = options;

    const mergedHeaders = new Headers(headers ?? {});
    mergedHeaders.set("Accept", "application/json");
    if (!(rest.body instanceof FormData)) {
        mergedHeaders.set("Content-Type", "application/json");
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
        ...rest,
        headers: mergedHeaders,
        cache: "no-store",
    });

    if (!response.ok) {
        const text = await response.text();
        let parsed: unknown = text;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = text;
        }

        throw new ApiError(`API request failed for ${path}`, response.status, parsed);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export function useApiClient() {
    return useCallback(async function authenticatedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
        return apiFetch<T>(path, { ...options });
    }, []);
}

export function getApiBaseUrl() {
    return API_BASE_URL;
}
