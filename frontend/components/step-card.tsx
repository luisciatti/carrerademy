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
    DIALOGUE_SIMULATOR: "border-violet-500/50",
    SCENARIO_BUILDER: "border-amber-500/50",
    MATCHING_GAME: "border-sky-500/50",
    RULES_RADIAL: "border-teal-500/50",
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
                border: "border-accent",
                borderStyle: "border-2",
                bg: "bg-surface/90",
                opacity: "",
                hover: "hover:-translate-y-0.5 hover:shadow-md hover:border-accent",
            };
        case "available":
            return {
                border: "border-border/60",
                borderStyle: "border",
                bg: "bg-surface/50",
                opacity: "",
                hover: "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md",
            };
        case "completed":
            return {
                border: "border-emerald-700/50",
                borderStyle: "border",
                bg: "bg-emerald-950/15",
                opacity: "",
                hover: "hover:-translate-y-0.5 hover:border-emerald-600/60 hover:shadow-sm",
            };
        case "locked":
            return {
                border: isPremium ? "border-amber-700/30" : "border-border/30",
                borderStyle: "border",
                bg: isPremium ? "bg-amber-950/10" : "bg-surface/30",
                opacity: "opacity-60",
                hover: "", // not interactive
            };
        case "bonus":
            return {
                border: BONUS_BORDER[step.content_type ?? ""] ?? "border-border/50",
                borderStyle: "border border-dashed",
                bg: "bg-surface/40",
                opacity: "",
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
    const activeRing = isActive ? "ring-1 ring-accent/40" : "";

    return (
        <div
            className={`${tk.borderStyle} ${tk.border} ${tk.bg} ${tk.opacity} ${tk.hover} ${activeRing} rounded-2xl p-3 transition-all duration-150`}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                    {variant === "bonus" ? "Bônus" : `Etapa ${step.order_index + 1}`}
                    {typeLabel ? ` · ${typeLabel}` : ""}
                </p>
                <span className="flex-shrink-0">
                    {variant === "available" && (
                        <span className="rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[10px] text-teal-300">
                            Disponível
                        </span>
                    )}
                    {variant === "completed" && (
                        <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                            <CheckSquare className="h-2.5 w-2.5" />
                        </span>
                    )}
                    {variant === "locked" && step.is_description_locked && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
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
                            className={`h-1 flex-1 rounded-full ${i < doneCount ? "bg-emerald-400" : i === doneCount && (variant === "current" || variant === "bonus") ? "bg-accent" : "bg-border/60"}`}
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
