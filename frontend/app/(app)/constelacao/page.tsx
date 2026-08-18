"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ConstellationView } from "@/components/constellation-view";
import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { CareerPath } from "@/lib/types";

export default function ConstellacaoPage() {
    const api = useBackendApi();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paths, setPaths] = useState<CareerPath[]>([]);
    const [hasSubscription, setHasSubscription] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [me, careerPaths] = await Promise.all([
                    api.getMe(),
                    api.getMyCareerPaths().catch((e: unknown) => {
                        if (isApiNotFound(e)) return [] as CareerPath[];
                        throw e;
                    }),
                ]);
                if (!cancelled) {
                    setHasSubscription(me.has_active_subscription);
                    setPaths(careerPaths);
                }
            } catch (e) {
                if (!cancelled) setError(extractApiMessage(e, "Não foi possível carregar as trilhas."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, [api]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-9rem)] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-foreground">Minhas Trilhas</h1>
                    <p className="text-sm text-muted">Clique em uma trilha para abrir o mapa.</p>
                </div>
                <Link href="/dashboard" className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                    Ver resumo →
                </Link>
            </div>
            <div className="h-[calc(100vh-11rem)]">
                <ConstellationView paths={paths} hasSubscription={hasSubscription} />
            </div>
        </div>
    );
}
