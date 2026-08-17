"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
                    <p className="mt-3 text-4xl font-black text-teal-200">0</p>
                    <p className="mt-2 text-sm text-zinc-400">Comece hoje para iniciar sua sequencia.</p>
                </article>

                <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 md:col-span-2">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Conta</p>
                    <h2 className="mt-2 text-2xl font-bold text-zinc-100">{data.me?.name ?? "Aluno"}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{data.me?.email}</p>
                </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                {renderPathCard({
                    title: "Soft Skills",
                    subtitle: "Gratuita e pronta agora",
                    badge: "Gratis",
                    badgeClassName: "bg-emerald-500/20 text-emerald-200",
                    path: standardPath,
                    href: "/trilha?kind=STANDARD_SOFT_SKILLS",
                    progressValue: standardPath ? Math.round((standardPath.steps.filter((step) => step.status === "COMPLETED").length / Math.max(1, standardPath.steps.length)) * 100) : 0,
                    progressLabel: `${standardPath ? Math.round((standardPath.steps.filter((step) => step.status === "COMPLETED").length / Math.max(1, standardPath.steps.length)) * 100) : 0}% concluido`,
                })}
                {renderPathCard({
                    title: "Trilha Personalizada",
                    subtitle: aiPath?.status === "GENERATING" ? "IA gerando em paralelo" : "Personalizada por IA",
                    badge: aiPath?.status === "GENERATING" ? "Gerando" : "Premium",
                    badgeClassName: aiPath?.status === "GENERATING" ? "bg-cyan-500/20 text-cyan-200" : "bg-teal-500/20 text-teal-200",
                    path: aiPath,
                    href: aiPath?.status === "GENERATING" ? "/trilha/gerando" : "/trilha?kind=AI_PERSONALIZED",
                    progressValue: progress,
                    progressLabel: `${progress}% concluido`,
                })}
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

function renderPathCard({
    title,
    subtitle,
    badge,
    badgeClassName,
    path,
    href,
    progressValue,
    progressLabel,
}: {
    title: string;
    subtitle: string;
    badge: string;
    badgeClassName: string;
    path: CareerPath | null;
    href: string;
    progressValue: number;
    progressLabel: string;
}) {
    return (
        <article className="rounded-2xl border border-teal-900/30 bg-gradient-to-br from-teal-950/20 to-zinc-950/50 p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Caminho</p>
                    <h3 className="mt-2 text-2xl font-bold text-zinc-100">{title}</h3>
                    <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>{badge}</span>
            </div>
            <p className="mt-4 text-sm text-zinc-400">{path?.title ?? "Aguardando disponibilidade"}</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded bg-zinc-800">
                <div className="h-full rounded bg-teal-500" style={{ width: `${path ? progressValue : 0}%` }} />
            </div>
            <p className="mt-2 text-sm text-zinc-300">{progressLabel}</p>
            <Link href={href} className="mt-5 inline-flex rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400">
                {path?.status === "GENERATING" ? "Acompanhar geracao" : "Abrir trilha"}
            </Link>
        </article>
    );
}
