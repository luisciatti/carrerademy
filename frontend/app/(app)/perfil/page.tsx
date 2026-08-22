"use client";

import { useUser } from "@clerk/nextjs";
import { Award, BookOpen, Compass, Flame, Footprints, Star, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { extractApiMessage, useBackendApi } from "@/lib/api";
import type { LeaderboardEntry, ProfileResponse } from "@/lib/types";

const ICON_MAP: Record<string, React.ReactNode> = {
    footprints: <Footprints className="h-6 w-6" />,
    zap: <Zap className="h-6 w-6" />,
    award: <Award className="h-6 w-6" />,
    flame: <Flame className="h-6 w-6" />,
    star: <Star className="h-6 w-6" />,
    compass: <Compass className="h-6 w-6" />,
    sparkles: <Zap className="h-6 w-6" />,
};

const KIND_LABELS: Record<string, string> = {
    STANDARD_SOFT_SKILLS: "Always Free",
    AI_PERSONALIZED: "IA Personalizada",
};

export default function PerfilPage() {
    const api = useBackendApi();
    const { user: clerkUser } = useUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [p, lb] = await Promise.all([api.getProfile(), api.getLeaderboard()]);
                if (!cancelled) {
                    setProfile(p);
                    setLeaderboard(lb);
                }
            } catch (e) {
                if (!cancelled) setError(extractApiMessage(e, "Nao foi possivel carregar o perfil."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, [api]);

    const initial = useMemo(() => {
        const name = profile?.user.name ?? clerkUser?.fullName ?? "?";
        return name.trim()[0]?.toUpperCase() ?? "?";
    }, [profile, clerkUser]);

    const unlockedCount = useMemo(
        () => profile?.achievements.filter((a) => a.unlocked).length ?? 0,
        [profile]
    );

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-32 animate-pulse rounded-2xl bg-surface" />
                <div className="h-48 animate-pulse rounded-2xl bg-surface" />
                <div className="h-64 animate-pulse rounded-2xl bg-surface" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    if (!profile) return null;

    const { stats, achievements, paths } = profile;

    return (
        <div className="space-y-6">
            {/* Header */}
            <section className="app-card flex flex-wrap items-center gap-5 p-6">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-2xl font-black text-accent-blue ring-2 ring-accent-blue/35">
                    {clerkUser?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={clerkUser.imageUrl} alt={profile.user.name} className="h-16 w-16 rounded-full object-cover" />
                    ) : initial}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-foreground">{profile.user.name}</h1>
                    <p className="text-sm text-muted">{profile.user.email}</p>
                </div>
                <a
                    href="https://accounts.clerk.dev/user"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                    Editar perfil
                </a>
            </section>

            {/* Stats strip */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    { label: "Etapas concluidas", value: stats.steps_completed },
                    { label: "Pontos este mes", value: stats.points_this_month },
                    { label: "Melhor sequencia", value: `${stats.best_streak} dias` },
                    { label: "Badges conquistados", value: unlockedCount },
                ].map(({ label, value }) => (
                    <article key={label} className="app-card p-4">
                        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                        <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
                    </article>
                ))}
            </section>

            {/* Badges */}
            <section className="app-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Conquistas</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {achievements.map((a) => (
                        <div
                            key={a.id}
                            className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-150 ${a.unlocked ? "border-accent-blue/40 bg-accent-blue/10 hover:border-accent-blue/60 hover:bg-accent-blue/15" : "border-border opacity-40"}`}
                        >
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${a.unlocked ? "bg-accent-blue/20 text-accent-blue" : "bg-surface text-muted"}`}>
                                {ICON_MAP[a.icon] ?? <BookOpen className="h-6 w-6" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                                <p className="mt-0.5 text-xs text-muted">{a.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trails */}
            <section className="app-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Trilhas</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {paths.map((path) => {
                        const pct = path.steps_total > 0 ? Math.round((path.steps_completed / path.steps_total) * 100) : 0;
                        return (
                            <div key={path.id} className="rounded-xl border border-border bg-surface-hover p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-muted">{KIND_LABELS[path.kind] ?? path.kind}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${path.status === "COMPLETED" ? "bg-accent-mint/20 text-accent-mint" : path.status === "ACTIVE" ? "bg-accent-blue/20 text-accent-blue" : "bg-surface text-muted"}`}>
                                        {path.status === "COMPLETED" ? "Concluida" : path.status === "ACTIVE" ? "Em andamento" : path.status}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-foreground">{path.title}</p>
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-muted">{pct}% — {path.steps_completed}/{path.steps_total} etapas</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Leaderboard */}
            <section className="app-card p-6">
                <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-accent-coral" />
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Ranking do mes</h2>
                </div>
                {leaderboard.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Sem atividade registrada ainda este mes.</p>
                ) : (
                    <ol className="mt-4 space-y-2">
                        {leaderboard.map((entry) => (
                            <li key={entry.rank} className="flex items-center gap-4 rounded-xl border border-border bg-surface-hover px-4 py-3">
                                <span className={`w-6 text-center text-sm font-bold ${entry.rank === 1 ? "text-accent-coral" : entry.rank === 2 ? "text-muted" : entry.rank === 3 ? "text-accent-purple" : "text-muted"}`}>
                                    #{entry.rank}
                                </span>
                                <span className="flex-1 text-sm text-foreground">{entry.name}</span>
                                <span className="text-sm font-semibold text-accent-blue">{entry.points} pts</span>
                            </li>
                        ))}
                    </ol>
                )}
                <p className="mt-3 text-xs text-muted">Ranking baseado em etapas concluidas no mes atual. Historico de meses anteriores em breve.</p>
            </section>
        </div>
    );
}
