"use client";

import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { extractApiMessage, useBackendApi } from "@/lib/api";
import type { CareerPath } from "@/lib/types";

export default function PaywallPage() {
    const api = useBackendApi();
    const [path, setPath] = useState<CareerPath | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await api.getMyCareerPaths();
                if (!cancelled) {
                    setPath(result.find((item) => item.kind === "AI_PERSONALIZED") ?? null);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(extractApiMessage(e, "Nao foi possivel carregar detalhes da trilha."));
                }
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [api]);

    const lockedPreview = useMemo(() => {
        if (!path) {
            return [];
        }
        return path.steps.filter((step) => step.status === "LOCKED").slice(0, 3);
    }, [path]);

    return (
        <div className="mx-auto max-w-3xl rounded-3xl border border-teal-900/40 bg-zinc-950/70 p-8">
            <p className="text-xs uppercase tracking-widest text-teal-300">Acesso premium</p>
            <h1 className="mt-2 text-3xl font-black text-zinc-100">Voce concluiu sua primeira etapa!</h1>
            <p className="mt-3 text-zinc-300">Desbloqueie o restante da sua trilha personalizada para acelerar sua evolucao.</p>

            {error && <p className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}

            <div className="mt-6 space-y-3">
                {lockedPreview.map((step) => (
                    <article key={step.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <p className="text-xs uppercase tracking-wider text-zinc-500">Etapa {step.order_index + 1}</p>
                        <h2 className="mt-1 text-lg font-semibold text-zinc-200">{step.title}</h2>
                        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                            <Lock className="h-4 w-4" />
                            Conteudo premium bloqueado
                        </p>
                    </article>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
                <button className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-teal-400">Assinar (em breve)</button>
                <a href="/trilha?kind=AI_PERSONALIZED" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-teal-400">
                    Voltar para trilha
                </a>
            </div>
        </div>
    );
}
