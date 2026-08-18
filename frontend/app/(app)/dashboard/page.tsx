"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { TrailCard } from "@/components/trail-card";
import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { CareerPath, MeResponse } from "@/lib/types";

type DashboardData = {
    me: MeResponse | null;
    paths: CareerPath[];
};

export default function DashboardPage() {
    const api = useBackendApi();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData>({ me: null, paths: [] });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const me = await api.getMe();
                let paths: CareerPath[] = [];

                try {
                    paths = await api.getMyCareerPaths();
                } catch (e) {
                    if (!isApiNotFound(e)) {
                        throw e;
                    }
                }

                if (!cancelled) {
                    if (paths.length === 0) {
                        router.replace("/onboarding");
                        return;
                    }
                    setData({ me, paths });
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
    }, [api, router]);

    const progress = useMemo(() => {
        const aiPath = data.paths.find((path) => path.kind === "AI_PERSONALIZED");
        if (!aiPath || aiPath.steps.length === 0) {
            return 0;
        }
        const completed = aiPath.steps.filter((s) => s.status === "COMPLETED").length;
        return Math.round((completed / aiPath.steps.length) * 100);
    }, [data.paths]);

    const standardPath = data.paths.find((path) => path.kind === "STANDARD_SOFT_SKILLS") ?? null;
    const aiPath = data.paths.find((path) => path.kind === "AI_PERSONALIZED") ?? null;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-28 animate-pulse rounded-2xl bg-surface" />
                <div className="h-44 animate-pulse rounded-2xl bg-surface" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-border bg-surface/40 p-5">
                    <p className="text-xs uppercase tracking-widest text-muted">Streak</p>
                    <p className="mt-3 text-4xl font-black text-teal-200">0</p>
                    <p className="mt-2 text-sm text-muted">Comece hoje para iniciar sua sequencia.</p>
                </article>

                <article className="rounded-2xl border border-border bg-surface/40 p-5 md:col-span-2">
                    <p className="text-xs uppercase tracking-widest text-muted">Conta</p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">{data.me?.name ?? "Aluno"}</h2>
                    <p className="mt-1 text-sm text-muted">{data.me?.email}</p>
                </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                {standardPath && (
                    <TrailCard
                        path={standardPath}
                        hasSubscription={data.me?.has_active_subscription ?? false}
                        ctaHref="/trilha?kind=STANDARD_SOFT_SKILLS"
                    />
                )}
                {aiPath && (
                    <TrailCard
                        path={aiPath}
                        hasSubscription={data.me?.has_active_subscription ?? false}
                        ctaHref={aiPath.status === "GENERATING" ? "/trilha/gerando" : "/trilha?kind=AI_PERSONALIZED"}
                    />
                )}
            </section>

            <section className="rounded-2xl border border-teal-900/40 bg-teal-950/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-teal-100">Trilha personalizada por IA sempre visivel</p>
                        <p className="mt-1 text-sm text-zinc-300">
                            Sua trilha premium conecta as mesmas habilidades ao seu objetivo profissional especifico informado no onboarding.
                        </p>
                    </div>
                    <Link href={aiPath?.status === "GENERATING" ? "/trilha/gerando" : "/trilha?kind=AI_PERSONALIZED"} className="rounded-lg border border-teal-700 px-3 py-2 text-sm text-teal-200 hover:border-teal-500 hover:text-teal-100">
                        {aiPath?.status === "GENERATING" ? "Ver geracao" : "Ver trilha IA"}
                    </Link>
                </div>
            </section>
        </div>
    );
}


