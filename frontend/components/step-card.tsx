"use client";

import { CheckSquare } from "lucide-react";

import type { CareerPathStep } from "@/lib/types";

export type StepCardVariant = "current" | "available" | "completed" | "locked" | "bonus";

type StepCardProps = {
    step: CareerPathStep;
    variant: StepCardVariant;
    isActive?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
    VIDEO: "Vídeo", QUIZ: "Quiz", INTERACTIVE_FORM: "Reflexão",
    SCENARIO_BUILDER: "Cenário", RULES_RADIAL: "Regras", MATCHING_GAME: "Associação",
    DIALOGUE_SIMULATOR: "Simulação", DIAGRAM: "Diagrama", ARTICLE: "Artigo",
    COURSE: "Curso", CERTIFICATION: "Certificação", ACTION_TASK: "Tarefa",
};

// Dashed border accent for bonus nodes, keyed by content type
const BONUS_BORDER: Record<string, string> = {
    DIALOGUE_SIMULATOR: "border-[color:var(--accent-purple)]/45",
    SCENARIO_BUILDER: "border-[color:var(--accent-coral)]/45",
    MATCHING_GAME: "border-[color:var(--accent-blue)]/45",
    RULES_RADIAL: "border-[color:var(--accent-mint)]/45",
};

type VariantTokens = {
    border: string;
    borderStyle: string;
    bg: string;
    opacity: string;
    hover: string;
};

function tokens(variant: StepCardVariant, step: CareerPathStep): VariantTokens {
    const isPremium = step.is_description_locked;
    switch (variant) {
        case "current":
            return {
                border: "border-[color:var(--accent-purple)]",
                borderStyle: "border-2",
                bg: "bg-white/90 dark:bg-surface/90",
                opacity: "",
                hover: "hover:-translate-y-0.5 hover:shadow-md hover:border-[color:var(--accent-purple)]",
            };
        case "available":
            return {
                border: "border-border/60",
                borderStyle: "border",
                bg: "bg-white/80 dark:bg-surface/60",
                opacity: "",
                hover: "hover:-translate-y-0.5 hover:border-[color:var(--accent-blue)]/40 hover:shadow-md",
            };
        case "completed":
            return {
                border: "border-[color:var(--accent-mint)]/45",
                borderStyle: "border",
                bg: "bg-[color:var(--accent-mint)]/10",
                opacity: "",
                hover: "hover:-translate-y-0.5 hover:border-[color:var(--accent-mint)]/60 hover:shadow-sm",
            };
        case "locked":
            return {
                border: isPremium ? "border-[color:var(--accent-coral)]/30" : "border-border/30",
                borderStyle: "border",
                bg: isPremium ? "bg-[color:var(--accent-coral)]/10" : "bg-white/60 dark:bg-surface/40",
                opacity: "opacity-60",
                hover: "", // not interactive
            };
        case "bonus":
            return {
                border: BONUS_BORDER[step.content_type ?? ""] ?? "border-border/50",
                borderStyle: "border border-dashed",
                bg: "bg-white/70 dark:bg-surface/45",
                opacity: "opacity-80",
                hover: "hover:-translate-y-0.5 hover:shadow-sm",
            };
    }
}

export function StepCard({ step, variant, isActive = false }: StepCardProps) {
    const tk = tokens(variant, step);
    const ct = step.content_type ?? "";
    const typeLabel = TYPE_LABELS[ct] ?? "";
    const total = Math.max(1, step.chain_total_stages);

    // Derive how many chain stages are done
    const doneCount = (() => {
        if (variant === "completed") return total;
        if (variant === "current") {
            const idx = step.chain_items.findIndex((item) => item.id === step.current_content_item_id);
            return idx >= 0 ? idx : 0;
        }
        return 0;
    })();

    // Optional active ring
    const activeRing = isActive ? "ring-2 ring-[color:var(--accent-purple)]/25" : "";
    const bonusScale = variant === "bonus" ? "scale-[0.97]" : "scale-100";

    return (
        <div
            className={`${tk.borderStyle} ${tk.border} ${tk.bg} ${tk.opacity} ${tk.hover} ${activeRing} ${bonusScale} rounded-2xl p-3 transition-all duration-150`}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                    {variant === "bonus" ? "Bonus opcional" : `Etapa ${step.order_index + 1}`}
                    {typeLabel ? ` · ${typeLabel}` : ""}
                </p>
                <span className="flex-shrink-0">
                    {variant === "available" && (
                        <span className="rounded-full bg-[color:var(--accent-blue)]/15 px-1.5 py-0.5 text-[10px] text-[color:var(--accent-blue)]">
                            Disponível
                        </span>
                    )}
                    {variant === "completed" && (
                        <span className="flex items-center gap-0.5 rounded-full bg-[color:var(--accent-mint)]/18 px-1.5 py-0.5 text-[10px] text-[color:var(--accent-mint)]">
                            <CheckSquare className="h-2.5 w-2.5" />
                        </span>
                    )}
                    {variant === "locked" && step.is_description_locked && (
                        <span className="rounded-full bg-[color:var(--accent-coral)]/15 px-1.5 py-0.5 text-[10px] text-[color:var(--accent-coral)]">
                            Premium
                        </span>
                    )}
                </span>
            </div>

            {/* Title */}
            <h3
                className={`mt-1 text-sm font-semibold leading-snug text-foreground ${variant === "locked" && step.is_description_locked ? "blur-[2px] select-none" : ""}`}
            >
                {step.title}
            </h3>

            {/* Chain stages bar — visible when multi-stage */}
            {total > 1 && (
                <div className="mt-2 flex gap-0.5">
                    {Array.from({ length: Math.min(total, 6) }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${i < doneCount ? "bg-[color:var(--accent-mint)]" : i === doneCount && (variant === "current" || variant === "bonus") ? "bg-[color:var(--accent-purple)]" : "bg-border/60"}`}
                        />
                    ))}
                    {total > 6 && (
                        <span className="ml-1 text-[10px] text-muted">+{total - 6}</span>
                    )}
                </div>
            )}

            {/* Description — omit for locked-premium (blurred title is enough) */}
            {!step.is_description_locked && step.description && variant !== "bonus" && (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {step.description}
                </p>
            )}
        </div>
    );
}
