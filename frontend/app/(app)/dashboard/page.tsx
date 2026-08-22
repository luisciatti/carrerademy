"use client";

import { ArrowRight, BookOpen, Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { AiGuide } from "@/components/ai-guide";
import { TrailCard } from "@/components/trail-card";
import { extractApiMessage } from "@/lib/api";
import { useDailySessionQuery, useMeQuery, useMyCareerPathsQuery, useNotesQuery, useProfileQuery } from "@/lib/backend-queries";
import type { Achievement, CareerPath, CareerPathStep } from "@/lib/types";

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
    const meQuery = useMeQuery();
    const pathsQuery = useMyCareerPathsQuery();
    const profileQuery = useProfileQuery();
    const dailyQuery = useDailySessionQuery();
    const notesQuery = useNotesQuery();

    const data = useMemo(() => {
        const sortedNotes = [...(notesQuery.data ?? [])].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return {
            me: meQuery.data ?? null,
            paths: pathsQuery.data ?? [],
            dailySession: dailyQuery.data ?? null,
            profile: profileQuery.data ?? null,
            notes: sortedNotes,
        };
    }, [dailyQuery.data, meQuery.data, notesQuery.data, pathsQuery.data, profileQuery.data]);

    const loading = meQuery.isLoading || pathsQuery.isLoading || profileQuery.isLoading || dailyQuery.isLoading || notesQuery.isLoading;
    const hardError = meQuery.error ?? pathsQuery.error;
    const error = hardError ? extractApiMessage(hardError, "Nao foi possivel carregar o dashboard.") : null;

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
            <AiGuide
                tipId="dashboard-welcome"
                trigger={!!data.me && data.paths.length > 0}
                message={continueTarget
                    ? "Bem-vindo. O caminho mais simples e tocar em Continuar de onde parou para seguir sem pensar no proximo passo."
                    : "Bem-vindo. Comece por uma trilha no seu painel e avance etapa por etapa para ganhar ritmo."
                }
            />

            <section className="app-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted">{greetingByHour()}</p>
                        <h1 className="mt-1 text-2xl font-black text-foreground">{displayName}, seu painel de progresso</h1>
                        <p className="mt-1 text-sm text-muted">Tudo o que importa hoje, em um so lugar.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-xl border border-accent-coral/35 bg-accent-coral/10 px-4 py-2">
                            <p className="text-xs uppercase tracking-wide text-accent-coral/80">Streak</p>
                            <p className="mt-1 flex items-center gap-1 text-lg font-black text-accent-coral">
                                <Flame className="h-4 w-4" />
                                {streak} dias
                            </p>
                        </div>
                        <div className="rounded-xl border border-accent-blue/35 bg-accent-blue/10 px-4 py-2">
                            <p className="text-xs uppercase tracking-wide text-accent-blue/80">Pontos no mes</p>
                            <p className="mt-1 text-lg font-black text-accent-blue">{pointsThisMonth}</p>
                        </div>
                    </div>
                </div>
            </section>

            {continueTarget && (
                <section className="app-card bg-gradient-to-r from-accent-purple/15 via-accent-blue/12 to-accent-mint/10 p-5">
                    <p className="text-xs uppercase tracking-widest text-accent-blue/80">Continuar de onde parou</p>
                    <h2 className="mt-2 text-xl font-black text-foreground">{continueTarget.step.title}</h2>
                    <p className="mt-1 text-sm text-muted">{continueTarget.path.title}</p>
                    <div className="mt-4">
                        <Link
                            href={`/trilha/${continueTarget.path.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-hover"
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
                    <Link href="/constelacao" className="text-sm text-accent-blue hover:text-accent-hover">
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
                <article className="app-card p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Sessao diaria</p>
                        <Flame className="h-4 w-4 text-accent-coral" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-foreground">{dailyDone}/{dailyTotal}</p>
                    <p className="mt-1 text-sm text-muted">objetivos concluidos hoje</p>
                    <Link href="/daily-session" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-blue hover:text-accent-hover">
                        Abrir sessao de hoje
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </article>

                <article className="app-card p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Perfil</p>
                        <Trophy className="h-4 w-4 text-accent-coral" />
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
                    <Link href="/perfil" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-blue hover:text-accent-hover">
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </article>
            </section>

            {recentAchievement && (
                <section className="rounded-2xl border border-accent-mint/35 bg-accent-mint/12 p-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent-mint" />
                        <p className="text-sm font-semibold text-foreground">Conquista desbloqueada nas ultimas 24h</p>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                        <span className="font-semibold text-accent-mint">{recentAchievement.title}</span> — {recentAchievement.description}
                    </p>
                </section>
            )}

            {data.notes.length > 0 && (
                <section className="app-card p-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-widest text-foreground">Anotacoes recentes</p>
                        <Link href="/notas" className="text-sm text-accent-blue hover:text-accent-hover">Ver todas</Link>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {data.notes.slice(0, 3).map((note) => {
                            const notePathId = note.path_step_id ? pathByStepId.get(note.path_step_id) : undefined;
                            const href = notePathId ? `/trilha/${notePathId}` : "/notas";
                            return (
                                <Link key={note.id} href={href} className="rounded-xl border border-border bg-surface/70 p-3 hover:border-accent-blue/45">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{note.title ?? "Sem titulo"}</p>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted">{notePreview(note.content)}</p>
                                    <p className="mt-2 flex items-center gap-1 text-[11px] text-accent-blue">
                                        <BookOpen className="h-3 w-3" />
                                        {note.step_title ?? "Anotacao geral"}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="app-card bg-gradient-to-r from-accent-purple/12 via-accent-blue/10 to-accent-mint/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Trilha personalizada por IA sempre visivel</p>
                        <p className="mt-1 text-sm text-muted">
                            Sua trilha premium conecta as mesmas habilidades ao seu objetivo profissional especifico informado no onboarding.
                        </p>
                    </div>
                    <Link href="/constelacao" className="rounded-lg border border-accent-blue/40 px-3 py-2 text-sm text-accent-blue hover:border-accent-blue hover:text-accent-hover">
                        Ver constelacao
                    </Link>
                </div>
            </section>
        </div>
    );
}


