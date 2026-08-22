"use client";

import { BookOpen, CheckSquare, Clock, Flame, Grip, Lock, MessageSquare, PlayCircle, RefreshCw, Star, Unlink2, Zap } from "lucide-react";
import { useState } from "react";

import { AiGuide } from "@/components/ai-guide";
import { extractApiMessage, useBackendApi } from "@/lib/api";
import { useDailySessionQuery } from "@/lib/backend-queries";
import type { DailyObjective, DailySessionResponse } from "@/lib/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function objectiveIcon(contentType: string | null, objectiveType: string) {
    if (objectiveType === "REVIEW") return <RefreshCw className="h-5 w-5" />;
    if (objectiveType === "BONUS") return <Star className="h-5 w-5" />;
    switch (contentType) {
        case "VIDEO": return <PlayCircle className="h-5 w-5" />;
        case "QUIZ": return <CheckSquare className="h-5 w-5" />;
        case "SCENARIO_BUILDER": return <Grip className="h-5 w-5" />;
        case "DIALOGUE_SIMULATOR": return <MessageSquare className="h-5 w-5" />;
        case "MATCHING_GAME": return <Unlink2 className="h-5 w-5" />;
        default: return <BookOpen className="h-5 w-5" />;
    }
}

function objectiveLabel(type: string) {
    switch (type) {
        case "PATH_STEP": return "Continuar trilha";
        case "REVIEW": return "Revisao rapida";
        case "BONUS": return "Desafio bonus";
        default: return type;
    }
}

export default function DailySessionPage() {
    const api = useBackendApi();
    const query = useDailySessionQuery();
    const [completing, setCompleting] = useState<string | null>(null);

    const session: DailySessionResponse | null = query.data ?? null;
    const loading = query.isLoading;
    const error = query.error ? extractApiMessage(query.error, "Nao foi possivel carregar a sessao do dia.") : null;

    const today = new Date();
    const weekDayIdx = today.getDay();

    // Derive streak days for the past 7 days indicator.
    const weekStrip = WEEKDAYS.map((label, idx) => {
        const diff = idx - weekDayIdx;
        const active = diff === 0;
        const past = diff < 0 && diff >= -(session?.current_streak ?? 0);
        return { label, active, past };
    });

    async function handleComplete(objective: DailyObjective) {
        if (objective.is_locked || objective.is_completed_today || completing) return;
        setCompleting(objective.id);
        try {
            const result = await api.completeDailyObjective(objective.id);
            await query.mutate((prev) => prev ? {
                ...prev,
                current_streak: result.current_streak,
                longest_streak: result.longest_streak,
                objectives: prev.objectives.map((o) =>
                    o.id === objective.id ? { ...o, is_completed_today: true } : o
                ),
            } : prev, false);
        } catch (e) {
            query.mutate();
        } finally {
            setCompleting(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-28 animate-pulse rounded-2xl bg-surface" />
                <div className="h-64 animate-pulse rounded-2xl bg-surface" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    if (!session) return null;

    const allDone = session.objectives.every((o) => o.is_completed_today);

    return (
        <div className="space-y-6">
            <AiGuide
                tipId="daily-session-first"
                trigger={!!session}
                message="Streak e sua sequencia de dias ativos. Complete sua sessao hoje para nao quebrar o ritmo."
            />

            {/* Header */}
            <section className="app-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted">
                            {today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                        </p>
                        <h1 className="mt-1 text-2xl font-black text-foreground">Sessao do dia</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-accent-coral/40 bg-accent-coral/12 px-4 py-2">
                            <Flame className="h-5 w-5 text-accent-coral" />
                            <span className="text-xl font-black text-accent-coral">{session.current_streak}</span>
                            <span className="text-sm text-muted">dias seguidos</span>
                        </div>
                    </div>
                </div>

                {/* Week strip */}
                <div className="mt-4 flex gap-1.5">
                    {weekStrip.map(({ label, active, past }) => (
                        <div
                            key={label}
                            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs ${active ? "bg-accent-blue/20 text-accent-blue" : past ? "bg-accent-coral/15 text-accent-coral" : "bg-surface text-muted"}`}
                        >
                            <span>{label}</span>
                            <div className={`h-2 w-2 rounded-full ${active ? "bg-accent-blue" : past ? "bg-accent-coral" : "bg-border"}`} />
                        </div>
                    ))}
                </div>
            </section>

            {allDone && (
                <div className="rounded-2xl border border-accent-mint/40 bg-accent-mint/12 p-4 text-center">
                    <p className="font-semibold text-accent-mint">Sessao de hoje concluida!</p>
                    <p className="mt-1 text-sm text-muted">Voce mantem sua sequencia de {session.current_streak} dias. Volte amanha.</p>
                </div>
            )}

            {/* Objectives */}
            <section className="space-y-4">
                {session.objectives.map((obj, idx) => (
                    <article
                        key={obj.id}
                        className={`rounded-2xl border p-5 transition-all duration-150 ${obj.is_completed_today
                            ? "border-accent-mint/40 bg-accent-mint/12 opacity-70"
                            : obj.is_locked
                                ? "border-border bg-surface"
                                : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${obj.objective_type === "BONUS" ? "bg-accent-purple/20 text-accent-purple" : obj.objective_type === "REVIEW" ? "bg-accent-blue/20 text-accent-blue" : "bg-accent-mint/20 text-accent-mint"}`}>
                                {objectiveIcon(obj.content_type, obj.objective_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted">{idx + 1}. {objectiveLabel(obj.objective_type)}</span>
                                    <span className="flex items-center gap-1 text-xs text-muted">
                                        <Clock className="h-3 w-3" /> ~{obj.estimated_minutes} min
                                    </span>
                                </div>
                                <h3 className="mt-1 text-sm font-semibold text-foreground">{obj.title}</h3>
                                <p className="mt-1 text-xs text-muted line-clamp-2">{obj.description}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            {obj.is_completed_today ? (
                                <span className="rounded-lg bg-accent-mint/20 px-3 py-1.5 text-xs font-semibold text-accent-mint">Concluido hoje</span>
                            ) : obj.is_locked ? (
                                <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted">
                                    <Lock className="h-3.5 w-3.5" /> Desbloquear com plano premium
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleComplete(obj)}
                                    disabled={completing === obj.id}
                                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                                >
                                    <Zap className="h-3.5 w-3.5" />
                                    {completing === obj.id ? "Registrando..." : "Marcar como feito"}
                                </button>
                            )}
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}
