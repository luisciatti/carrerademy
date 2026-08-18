"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { CareerPath } from "@/lib/types";

export default function EscolhaTrilhaPage() {
    const api = useBackendApi();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paths, setPaths] = useState<CareerPath[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const result = await api.getMyCareerPaths();
                if (!cancelled) {
                    setPaths(result);
                }
            } catch (e) {
                if (!cancelled) {
                    if (isApiNotFound(e)) {
                        setError("Ainda nao encontramos trilhas para sua conta. Refaça o onboarding para continuar.");
                    } else {
                        setError(extractApiMessage(e, "Nao foi possivel carregar suas trilhas."));
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [api]);

    const standardPath = useMemo(() => paths.find((path) => path.kind === "STANDARD_SOFT_SKILLS") ?? null, [paths]);
    const aiPath = useMemo(() => paths.find((path) => path.kind === "AI_PERSONALIZED") ?? null, [paths]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-32 animate-pulse rounded-2xl bg-zinc-900/70" />
                <div className="h-48 animate-pulse rounded-2xl bg-zinc-900/70" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-teal-900/40 bg-zinc-950/70 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Escolha sua experiencia</p>
                <h1 className="mt-2 text-2xl font-black text-zinc-100">Suas trilhas estao prontas</h1>
                <p className="mt-2 text-sm text-zinc-300">
                    Comece agora pela trilha Always Free ou acompanhe sua trilha personalizada por IA.
                </p>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold text-zinc-100">Trilha Normal (Always Free)</h2>
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">Gratis</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                        Conteudo liberado para sempre com video no YouTube, reflexoes e mini-jogos práticos.
                    </p>
                    <p className="mt-3 text-sm text-zinc-400">{standardPath?.title ?? "Pronta para iniciar"}</p>
                    <Link href={standardPath ? `/trilha/${standardPath.id}` : "/constelacao"} className="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
                        Entrar na Always Free
                    </Link>
                </article>

                <article className="rounded-2xl border border-teal-800/40 bg-teal-950/20 p-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold text-zinc-100">Trilha Personalizada com IA</h2>
                        <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200">Premium</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                        Cenarios e atividades adaptados ao seu objetivo e ao cargo que voce quer conquistar.
                    </p>
                    <p className="mt-3 text-sm text-zinc-400">
                        {aiPath?.status === "GENERATING" ? "Estamos montando sua trilha agora." : aiPath?.title ?? "Aguardando disponibilidade"}
                    </p>
                    <Link
                        href={aiPath?.status === "GENERATING" ? `/trilha/gerando?career_path_id=${aiPath.id}` : aiPath ? `/trilha/${aiPath.id}` : "/constelacao"}
                        className="mt-5 inline-flex rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400"
                    >
                        {aiPath?.status === "GENERATING" ? "Acompanhar geracao" : "Abrir trilha IA"}
                    </Link>
                </article>
            </section>
        </div>
    );
}
