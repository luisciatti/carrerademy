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

    const accentByKind = path.kind === "AI_PERSONALIZED"
        ? { progress: "bg-[color:var(--accent-purple)]", cta: "bg-[var(--accent-purple)]", hover: "hover:shadow-[0_16px_36px_rgba(155,114,242,0.16)]" }
        : { progress: "bg-[color:var(--accent-blue)]", cta: "bg-[var(--accent-blue)]", hover: "hover:shadow-[0_16px_36px_rgba(75,123,236,0.14)]" };

    const cardBase = "group relative rounded-3xl border border-white/40 bg-surface p-6 shadow-[0_18px_42px_rgba(99,78,117,0.08)] transition-all duration-150";
    const cardVariant: Record<Variant, string> = {
        active: `${accentByKind.hover} hover:-translate-y-0.5`,
        premium: "bg-gradient-to-br from-[color:var(--accent-coral)]/10 to-surface hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(255,126,103,0.14)]",
        generating: "bg-gradient-to-br from-[color:var(--accent-blue)]/8 to-surface",
    };

    const badgeVariant: Record<Variant, { label: string; cls: string }> = {
        active: isAi
            ? { label: "PERSONALIZADA", cls: "border-0 bg-[color:var(--accent-purple)]/14 text-[color:var(--accent-purple)]" }
            : { label: "GRATIS", cls: "border-0 bg-[color:var(--accent-mint)]/18 text-[color:var(--accent-blue)]" },
        premium: { label: "PREMIUM", cls: "border-0 bg-[color:var(--accent-coral)]/16 text-[color:var(--accent-coral)]" },
        generating: { label: "GERANDO", cls: "border-0 bg-[color:var(--accent-blue)]/14 text-[color:var(--accent-blue)]" },
    };

    const badge = badgeVariant[variant];
    const progressColor = variant === "premium" ? "bg-[color:var(--accent-coral)]" : accentByKind.progress;

    return (
        <article className={`${cardBase} ${cardVariant[variant]}`}>
            {/* Badge + lock */}
            <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${badge.cls}`}>
                    {badge.label}
                </span>
                {variant === "premium" && (
                    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--accent-coral)]/80" />
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
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--accent-blue)]" />
                        Aguarde — sua trilha está sendo criada…
                    </p>
                ) : variant === "premium" ? (
                    <Link
                        href={ctaHref}
                        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-coral)] px-4 py-2.5 text-sm font-bold text-white transition-colors duration-150 hover:opacity-90"
                    >
                        <Lock className="h-4 w-4" />
                        Desbloquear
                    </Link>
                ) : (
                    <Link
                        href={ctaHref}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white transition-colors duration-150 hover:opacity-90 ${accentByKind.cta}`}
                    >
                        {hasProgress ? "Continuar" : "Começar"}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                )}
            </div>
        </article>
    );
}
