"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { CareerPath, MeResponse } from "@/lib/types";

type DashboardData = {
    me: MeResponse | null;
    path: CareerPath | null;
};

export default function DashboardPage() {
    const api = useBackendApi();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData>({ me: null, path: null });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const me = await api.getMe();
                let path: CareerPath | null = null;

                try {
                    path = await api.getMyCareerPath();
                } catch (e) {
                    if (!isApiNotFound(e)) {
                        throw e;
                    }
                }

                if (!cancelled) {
                    setData({ me, path });
                }
            } catch (e) {
                if (!cancelled) {
                    setError(extractApiMessage(e, "Nao foi possivel carregar o dashboard."));
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

    const progress = useMemo(() => {
        if (!data.path || data.path.steps.length === 0) {
            return 0;
        }
        const completed = data.path.steps.filter((s) => s.status === "COMPLETED").length;
        return Math.round((completed / data.path.steps.length) * 100);
    }, [data.path]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-28 animate-pulse rounded-2xl bg-zinc-900/70" />
                <div className="h-44 animate-pulse rounded-2xl bg-zinc-900/70" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Streak</p>
                    <p className="mt-3 text-4xl font-black text-violet-200">0</p>
                    <p className="mt-2 text-sm text-zinc-400">Comece hoje para iniciar sua sequencia.</p>
                </article>

                <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 md:col-span-2">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Conta</p>
                    <h2 className="mt-2 text-2xl font-bold text-zinc-100">{data.me?.name ?? "Aluno"}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{data.me?.email}</p>
                </article>
            </section>

            <section className="rounded-2xl border border-violet-900/40 bg-gradient-to-br from-violet-950/30 to-zinc-950/50 p-6">
                {!data.path ? (
                    <div>
                        <h3 className="text-xl font-bold">Vamos montar sua trilha</h3>
                        <p className="mt-2 text-sm text-zinc-300">Ainda nao encontramos onboarding para sua conta.</p>
                        <Link href="/onboarding" className="mt-5 inline-flex rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400">
                            Iniciar onboarding
                        </Link>
                    </div>
                ) : (
                    <div>
                        <p className="text-xs uppercase tracking-widest text-violet-300">Trilha atual</p>
                        <h3 className="mt-2 text-2xl font-bold text-zinc-100">{data.path.title}</h3>
                        <div className="mt-4 h-2 w-full overflow-hidden rounded bg-zinc-800">
                            <div className="h-full rounded bg-violet-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">{progress}% concluido</p>
                        <div className="mt-5 flex gap-3">
                            <Link href="/trilha" className="inline-flex rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400">
                                Continuar trilha
                            </Link>
                            <Link href="/onboarding" className="inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-violet-400">
                                Gerar nova trilha
                            </Link>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
