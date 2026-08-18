"use client";

import { ArrowRight, BookOpen, Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { TrailCard } from "@/components/trail-card";
import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { Achievement, CareerPath, CareerPathStep, DailySessionResponse, MeResponse, Note, ProfileResponse } from "@/lib/types";

type DashboardData = {
    me: MeResponse | null;
    paths: CareerPath[];
    dailySession: DailySessionResponse | null;
    profile: ProfileResponse | null;
    notes: Note[];
};

type ContinueTarget = {
    path: CareerPath;
    step: CareerPathStep;
};

function greetingByHour() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
}

function pickContinueTarget(paths: CareerPath[]): ContinueTarget | null {
    const candidates = paths.flatMap((path) =>
        path.steps
            .filter((step) => step.status === "UNLOCKED")
            .map((step) => ({ path, step }))
    );

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
        const scoreA =
            (a.step.current_content_item_id ? 100 : 0) +
            (a.path.kind === "AI_PERSONALIZED" ? 30 : 0) +
            (a.path.status === "ACTIVE" ? 10 : 0) -
            a.step.order_index;

        const scoreB =
            (b.step.current_content_item_id ? 100 : 0) +
            (b.path.kind === "AI_PERSONALIZED" ? 30 : 0) +
            (b.path.status === "ACTIVE" ? 10 : 0) -
            b.step.order_index;

        return scoreB - scoreA;
    });

    return candidates[0] ?? null;
}

function pickRecentAchievement(achievements: Achievement[]): Achievement | null {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const recent = achievements
        .filter((a) => a.unlocked && a.unlocked_at)
        .filter((a) => {
            const ts = new Date(a.unlocked_at as string).getTime();
            return Number.isFinite(ts) && now - ts <= oneDay;
        })
        .sort((a, b) => new Date(b.unlocked_at as string).getTime() - new Date(a.unlocked_at as string).getTime());

    return recent[0] ?? null;
}

function notePreview(content: string): string {
    return content.trim().slice(0, 96).replace(/\n/g, " ") || "Anotacao vazia";
}

export default function DashboardPage() {
    const api = useBackendApi();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData>({ me: null, paths: [], dailySession: null, profile: null, notes: [] });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const mePromise = api.getMe();
                const profilePromise = api.getProfile().catch(() => null);
                const dailyPromise = api.getDailySession().catch(() => null);
                const notesPromise = api.getNotes().catch(() => [] as Note[]);

                const me = await mePromise;
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
                    const [profile, dailySession, notes] = await Promise.all([profilePromise, dailyPromise, notesPromise]);
                    const sortedNotes = [...notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                    setData({ me, paths, profile, dailySession, notes: sortedNotes });
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

    const continueTarget = useMemo(() => pickContinueTarget(data.paths), [data.paths]);
    const recentAchievement = useMemo(
        () => pickRecentAchievement(data.profile?.achievements ?? []),
        [data.profile?.achievements]
    );
    const unlockedBadges = useMemo(
        () => (data.profile?.achievements ?? []).filter((a) => a.unlocked).length,
        [data.profile?.achievements]
    );
    const pathByStepId = useMemo(() => {
        const map = new Map<string, string>();
        for (const path of data.paths) {
            for (const step of path.steps) {
                map.set(step.id, path.id);
            }
        }
        return map;
    }, [data.paths]);
    const dailyDone = useMemo(
        () => (data.dailySession?.objectives.filter((o) => o.is_completed_today).length ?? 0),
        [data.dailySession?.objectives]
    );
    const dailyTotal = data.dailySession?.objectives.length ?? 0;
    const streak = data.dailySession?.current_streak ?? data.me?.current_streak ?? 0;
    const pointsThisMonth = data.profile?.stats.points_this_month ?? 0;
    const displayName = data.me?.name?.split(" ")[0] ?? "Aluno";

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-28 animate-pulse rounded-2xl bg-surface" />
                <div className="h-44 animate-pulse rounded-2xl bg-surface" />
                <div className="h-28 animate-pulse rounded-2xl bg-surface" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted">{greetingByHour()}</p>
                        <h1 className="mt-1 text-2xl font-black text-foreground">{displayName}, seu painel de progresso</h1>
                        <p className="mt-1 text-sm text-muted">Tudo o que importa hoje, em um so lugar.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-xl border border-orange-700/40 bg-orange-950/25 px-4 py-2">
                            <p className="text-xs uppercase tracking-wide text-orange-200/80">Streak</p>
                            <p className="mt-1 flex items-center gap-1 text-lg font-black text-orange-200">
                                <Flame className="h-4 w-4" />
                                {streak} dias
                            </p>
                        </div>
                        <div className="rounded-xl border border-teal-700/40 bg-teal-950/25 px-4 py-2">
                            <p className="text-xs uppercase tracking-wide text-teal-200/80">Pontos no mes</p>
                            <p className="mt-1 text-lg font-black text-teal-200">{pointsThisMonth}</p>
                        </div>
                    </div>
                </div>
            </section>

            {continueTarget && (
                <section className="rounded-2xl border border-teal-800/40 bg-gradient-to-r from-teal-950/35 to-cyan-950/20 p-5">
                    <p className="text-xs uppercase tracking-widest text-teal-200/80">Continuar de onde parou</p>
                    <h2 className="mt-2 text-xl font-black text-teal-100">{continueTarget.step.title}</h2>
                    <p className="mt-1 text-sm text-zinc-300">{continueTarget.path.title}</p>
                    <div className="mt-4">
                        <Link
                            href={`/trilha/${continueTarget.path.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-teal-400"
                        >
                            Continuar agora
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Suas trilhas</h2>
                    <Link href="/constelacao" className="text-sm text-teal-300 hover:text-teal-200">
                        Explorar mais trilhas
                    </Link>
                </div>
                {data.paths.map((path) => (
                    <TrailCard
                        key={path.id}
                        path={path}
                        hasSubscription={data.me?.has_active_subscription ?? false}
                        ctaHref={path.status === "GENERATING" ? `/trilha/gerando?career_path_id=${path.id}` : `/trilha/${path.id}`}
                    />
                ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Sessao diaria</p>
                        <Flame className="h-4 w-4 text-orange-400" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-foreground">{dailyDone}/{dailyTotal}</p>
                    <p className="mt-1 text-sm text-muted">objetivos concluidos hoje</p>
                    <Link href="/daily-session" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200">
                        Abrir sessao de hoje
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </article>

                <article className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Perfil</p>
                        <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted">Etapas</p>
                            <p className="mt-1 text-lg font-black text-foreground">{data.profile?.stats.steps_completed ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted">Badges</p>
                            <p className="mt-1 text-lg font-black text-foreground">{unlockedBadges}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted">Melhor streak</p>
                            <p className="mt-1 text-lg font-black text-foreground">{data.profile?.stats.best_streak ?? 0}</p>
                        </div>
                    </div>
                    <Link href="/perfil" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200">
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </article>
            </section>

            {recentAchievement && (
                <section className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-300" />
                        <p className="text-sm font-semibold text-emerald-100">Conquista desbloqueada nas ultimas 24h</p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">
                        <span className="font-semibold text-emerald-200">{recentAchievement.title}</span> — {recentAchievement.description}
                    </p>
                </section>
            )}

            {data.notes.length > 0 && (
                <section className="rounded-2xl border border-teal-900/40 bg-teal-950/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-widest text-teal-100">Anotacoes recentes</p>
                        <Link href="/notas" className="text-sm text-teal-300 hover:text-teal-200">Ver todas</Link>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {data.notes.slice(0, 3).map((note) => {
                            const notePathId = note.path_step_id ? pathByStepId.get(note.path_step_id) : undefined;
                            const href = notePathId ? `/trilha/${notePathId}` : "/notas";
                            return (
                                <Link key={note.id} href={href} className="rounded-xl border border-border bg-surface/60 p-3 hover:border-teal-700/40">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{note.title ?? "Sem titulo"}</p>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted">{notePreview(note.content)}</p>
                                    <p className="mt-2 flex items-center gap-1 text-[11px] text-teal-300">
                                        <BookOpen className="h-3 w-3" />
                                        {note.step_title ?? "Anotacao geral"}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-2xl border border-teal-900/40 bg-teal-950/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-teal-100">Trilha personalizada por IA sempre visivel</p>
                        <p className="mt-1 text-sm text-zinc-300">
                            Sua trilha premium conecta as mesmas habilidades ao seu objetivo profissional especifico informado no onboarding.
                        </p>
                    </div>
                    <Link href="/constelacao" className="rounded-lg border border-teal-700 px-3 py-2 text-sm text-teal-200 hover:border-teal-500 hover:text-teal-100">
                        Ver constelacao
                    </Link>
                </div>
            </section>
        </div>
    );
}


