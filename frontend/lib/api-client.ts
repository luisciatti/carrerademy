"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    const { token, headers, ...rest } = options;

    const mergedHeaders = new Headers(headers ?? {});
    mergedHeaders.set("Accept", "application/json");
    if (!(rest.body instanceof FormData)) {
        mergedHeaders.set("Content-Type", "application/json");
    }
    if (token) {
        mergedHeaders.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
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
    const { getToken } = useAuth();
    const router = useRouter();

    return async function authenticatedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
        const token = await getToken();
        try {
            return await apiFetch<T>(path, { ...options, token });
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                router.push("/sign-in");
            }
            throw error;
        }
    };
}

export function getApiBaseUrl() {
    return API_BASE_URL;
}
