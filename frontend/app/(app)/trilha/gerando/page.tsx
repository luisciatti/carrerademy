"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { CareerPath } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 60000;

export default function TrailGeneratingPage() {
    const api = useBackendApi();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [path, setPath] = useState<CareerPath | null>(null);
    const startedAtRef = useRef<number | null>(null);
    const expectedCareerPathId = searchParams.get("career_path_id");

    useEffect(() => {
        if (startedAtRef.current === null) {
            startedAtRef.current = Date.now();
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let cancelled = false;

        async function checkStatus() {
            try {
                const result = await api.getMyCareerPath();
                if (cancelled) {
                    return;
                }

                if (expectedCareerPathId && result.id !== expectedCareerPathId) {
                    return;
                }

                setPath(result);

                if (result.status === "ACTIVE") {
                    router.replace("/trilha");
                }
            } catch (e) {
                if (cancelled) {
                    return;
                }
                if (isApiNotFound(e)) {
                    return;
                }
                setError(extractApiMessage(e, "Nao foi possivel consultar a geracao da trilha."));
            }
        }

        void checkStatus();
        intervalId = setInterval(() => {
            void checkStatus();
        }, POLL_INTERVAL_MS);

        timeoutId = setTimeout(() => {
            if (cancelled) {
                return;
            }

            if (startedAtRef.current !== null && Date.now() - startedAtRef.current >= TIMEOUT_MS) {
                setError("A geracao demorou mais que o esperado. Tente novamente em instantes.");
            }
        }, TIMEOUT_MS);

        return () => {
            cancelled = true;
            if (intervalId) {
                clearInterval(intervalId);
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [api, expectedCareerPathId, router]);

    return (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center rounded-3xl border border-violet-900/40 bg-zinc-950/70 p-8 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <h1 className="mt-6 text-2xl font-black text-zinc-100">Montando sua trilha personalizada...</h1>
            <p className="mt-2 text-sm text-zinc-400">Estamos organizando a melhor sequencia de estudo com base no seu objetivo.</p>

            <div className="mt-6 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-left">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Status atual</p>
                <p className="mt-2 text-sm text-zinc-200">{path?.status ?? "GENERATING"}</p>
            </div>

            {error && <p className="mt-5 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        </div>
    );
}
