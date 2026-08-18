"use client";

import { BookOpen, CheckSquare, Clock, Flame, Grip, Lock, MessageSquare, PlayCircle, RefreshCw, Star, Unlink2, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { extractApiMessage, useBackendApi } from "@/lib/api";
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<DailySessionResponse | null>(null);
    const [completing, setCompleting] = useState<string | null>(null);

    const today = new Date();
    const weekDayIdx = today.getDay();

    // Derive streak days for the past 7 days indicator.
    const weekStrip = WEEKDAYS.map((label, idx) => {
        const diff = idx - weekDayIdx;
        const active = diff === 0;
        const past = diff < 0 && diff >= -(session?.current_streak ?? 0);
        return { label, active, past };
    });

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getDailySession();
                if (!cancelled) setSession(data);
            } catch (e) {
                if (!cancelled) setError(extractApiMessage(e, "Nao foi possivel carregar a sessao do dia."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, [api]);

    async function handleComplete(objective: DailyObjective) {
        if (objective.is_locked || objective.is_completed_today || completing) return;
        setCompleting(objective.id);
        try {
            const result = await api.completeDailyObjective(objective.id);
            setSession((prev) => prev ? {
                ...prev,
                current_streak: result.current_streak,
                longest_streak: result.longest_streak,
                objectives: prev.objectives.map((o) =>
                    o.id === objective.id ? { ...o, is_completed_today: true } : o
                ),
            } : prev);
        } catch (e) {
            setError(extractApiMessage(e, "Nao foi possivel registrar a atividade."));
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
            {/* Header */}
            <section className="rounded-2xl border border-teal-900/30 bg-surface/40 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-500">
                            {today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                        </p>
                        <h1 className="mt-1 text-2xl font-black text-foreground">Sessao do dia</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-orange-700/40 bg-orange-950/25 px-4 py-2">
                            <Flame className="h-5 w-5 text-orange-400" />
                            <span className="text-xl font-black text-orange-200">{session.current_streak}</span>
                            <span className="text-sm text-muted">dias seguidos</span>
                        </div>
                    </div>
                </div>

                {/* Week strip */}
                <div className="mt-4 flex gap-1.5">
                    {weekStrip.map(({ label, active, past }) => (
                        <div
                            key={label}
                            className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs ${active ? "bg-teal-500/20 text-teal-200" : past ? "bg-orange-500/15 text-orange-300" : "bg-surface text-muted"}`}
                        >
                            <span>{label}</span>
                            <div className={`h-2 w-2 rounded-full ${active ? "bg-teal-400" : past ? "bg-orange-400" : "bg-border"}`} />
                        </div>
                    ))}
                </div>
            </section>

            {allDone && (
                <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/25 p-4 text-center">
                    <p className="font-semibold text-emerald-200">Sessao de hoje concluida!</p>
                    <p className="mt-1 text-sm text-muted">Voce mantem sua sequencia de {session.current_streak} dias. Volte amanha.</p>
                </div>
            )}

            {/* Objectives */}
            <section className="space-y-4">
                {session.objectives.map((obj, idx) => (
                    <article
                        key={obj.id}
                        className={`rounded-2xl border p-5 transition-all duration-150 ${obj.is_completed_today
                                ? "border-emerald-700/40 bg-emerald-950/15 opacity-70"
                                : obj.is_locked
                                    ? "border-border bg-surface"
                                    : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${obj.objective_type === "BONUS" ? "bg-amber-500/20 text-amber-300" : obj.objective_type === "REVIEW" ? "bg-blue-500/20 text-blue-300" : "bg-teal-500/20 text-teal-300"}`}>
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
                                <span className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300">Concluido hoje</span>
                            ) : obj.is_locked ? (
                                <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted">
                                    <Lock className="h-3.5 w-3.5" /> Desbloquear com plano premium
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleComplete(obj)}
                                    disabled={completing === obj.id}
                                    className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:opacity-60"
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
