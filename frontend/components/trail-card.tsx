"use client";

import { ArrowRight, Clock, Layers, Loader2, Lock } from "lucide-react";
import Link from "next/link";

import type { CareerPath } from "@/lib/types";

type TrailCardProps = {
    path: CareerPath;
    hasSubscription: boolean;
    ctaHref: string;
};

type Variant = "active" | "premium" | "generating";

const PER_TYPE: Record<string, number> = {
    VIDEO: 8, QUIZ: 5, INTERACTIVE_FORM: 7, SCENARIO_BUILDER: 8,
    RULES_RADIAL: 5, MATCHING_GAME: 6, DIALOGUE_SIMULATOR: 10,
    DIAGRAM: 5, ARTICLE: 10, COURSE: 15, CERTIFICATION: 20, ACTION_TASK: 10,
};

function estimateMinutes(path: CareerPath): number {
    return path.steps.reduce((total, step) => {
        return total + (PER_TYPE[step.content_type ?? ""] ?? 5) * Math.max(1, step.chain_total_stages);
    }, 0);
}

function formatMinutes(min: number): string {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function deriveVariant(path: CareerPath, hasSubscription: boolean): Variant {
    if (path.kind === "STANDARD_SOFT_SKILLS") return "active";
    if (path.status === "GENERATING") return "generating";
    if (!hasSubscription) return "premium";
    return "active";
}

export function TrailCard({ path, hasSubscription, ctaHref }: TrailCardProps) {
    const variant = deriveVariant(path, hasSubscription);
    const completedCount = path.steps.filter((s) => s.status === "COMPLETED").length;
    const totalSteps = path.steps.length;
    const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    const totalMin = estimateMinutes(path);
    const hasProgress = completedCount > 0;
    const isAi = path.kind === "AI_PERSONALIZED";

    const cardBase = "group relative rounded-2xl border p-6 transition-all duration-150";
    const cardVariant: Record<Variant, string> = {
        active: "border-border/60 bg-surface/40 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_28px_rgba(0,0,0,0.3)]",
        premium: "border-amber-700/40 bg-gradient-to-br from-amber-950/30 to-surface/40 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-[0_8px_28px_rgba(0,0,0,0.3)]",
        generating: "border-border/40 bg-surface/30",
    };

    const badgeVariant: Record<Variant, { label: string; cls: string }> = {
        active: isAi
            ? { label: "PERSONALIZADA", cls: "bg-teal-500/20 text-teal-200 border-teal-700/40" }
            : { label: "GRÁTIS", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-700/40" },
        premium: { label: "PREMIUM", cls: "bg-amber-500/20 text-amber-200 border-amber-700/40" },
        generating: { label: "GERANDO", cls: "bg-cyan-500/20 text-cyan-200 border-cyan-700/40" },
    };

    const badge = badgeVariant[variant];
    const progressColor = variant === "premium" ? "bg-amber-400" : "bg-accent";

    return (
        <article className={`${cardBase} ${cardVariant[variant]}`}>
            {/* Badge + lock */}
            <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${badge.cls}`}>
                    {badge.label}
                </span>
                {variant === "premium" && (
                    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400/70" />
                )}
            </div>

            {/* Title */}
            <h3 className={`mt-3 text-lg font-black leading-snug ${variant === "premium" ? "text-foreground/70" : "text-foreground"}`}>
                {variant === "generating" ? "Gerando sua trilha personalizada…" : path.title}
            </h3>

            {/* Stats */}
            {variant !== "generating" && totalSteps > 0 && (
                <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {totalSteps} etapas
                    </span>
                    <span className="h-3 w-px bg-border" />
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        ~{formatMinutes(totalMin)}
                    </span>
                </div>
            )}

            {/* Progress */}
            {variant !== "generating" && (
                <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="uppercase tracking-wider text-muted">Progresso</span>
                        <span className="font-semibold text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-muted">{completedCount}/{totalSteps} etapas concluídas</p>
                </div>
            )}

            {/* Last activity */}
            {variant !== "generating" && (
                <p className="mt-3 text-[11px] text-muted">
                    <span className="uppercase tracking-wider">Última atividade</span>
                    <span className="ml-2 font-medium text-foreground/60">{hasProgress ? "Em andamento" : "—"}</span>
                </p>
            )}

            {/* CTA */}
            <div className="mt-5">
                {variant === "generating" ? (
                    <p className="flex items-center gap-2 text-xs text-muted">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        Aguarde — sua trilha está sendo criada…
                    </p>
                ) : variant === "premium" ? (
                    <Link
                        href={ctaHref}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-600/50 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-200 transition-colors duration-150 hover:bg-amber-500/20 hover:border-amber-500/60"
                    >
                        <Lock className="h-4 w-4" />
                        Desbloquear
                    </Link>
                ) : (
                    <Link
                        href={ctaHref}
                        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-background transition-colors duration-150 hover:bg-accent-hover"
                    >
                        {hasProgress ? "Continuar" : "Começar"}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                )}
            </div>
        </article>
    );
}
