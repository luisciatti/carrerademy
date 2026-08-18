"use client";

import { Award, ChevronRight, Clock, Flame, Layers } from "lucide-react";

import type { CareerPath, CareerPathKind } from "@/lib/types";

type TrailHeaderCardProps = {
    path: CareerPath;
    completionRate: number;
    selectedKind: CareerPathKind;
    onKindChange: (kind: CareerPathKind) => void;
    recentlyCompleted: boolean;
};

const CAREER_ICONS: Record<string, string> = {
    tech: "⚙️",
    design: "🎨",
    marketing: "📣",
    sales: "🤝",
    finance: "📊",
    operations: "⚡",
    other: "🌐",
};

function deriveLevel(pct: number): { label: string; color: string } {
    if (pct >= 67) return { label: "Avançado", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    if (pct >= 34) return { label: "Intermediário", color: "bg-violet-500/20 text-violet-300 border-violet-500/30" };
    return { label: "Fundamentos", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" };
}

function estimateTrailMinutes(steps: CareerPath["steps"]): number {
    const PER_TYPE: Record<string, number> = {
        VIDEO: 8, QUIZ: 5, INTERACTIVE_FORM: 7, SCENARIO_BUILDER: 8,
        RULES_RADIAL: 5, MATCHING_GAME: 6, DIALOGUE_SIMULATOR: 10,
        DIAGRAM: 5, ARTICLE: 10, COURSE: 15, CERTIFICATION: 20, ACTION_TASK: 10,
    };
    return steps.reduce((total, step) => {
        const base = PER_TYPE[step.content_type ?? ""] ?? 5;
        return total + base * Math.max(1, step.chain_total_stages);
    }, 0);
}

function nextMilestone(pct: number): { label: string; at: number } {
    if (pct < 25) return { label: "primeiro quarto", at: 25 };
    if (pct < 50) return { label: "metade", at: 50 };
    if (pct < 75) return { label: "três quartos", at: 75 };
    return { label: "conclusão", at: 100 };
}

export function TrailHeaderCard({ path, completionRate, selectedKind, onKindChange, recentlyCompleted }: TrailHeaderCardProps) {
    const level = deriveLevel(completionRate);
    const totalMin = estimateTrailMinutes(path.steps);
    const milestone = nextMilestone(completionRate);
    const completedCount = path.steps.filter((s) => s.status === "COMPLETED").length;

    const careerTag = (path.steps.find((s) => s.content_type)?.content_type ?? "").toLowerCase();
    const careerEmoji = CAREER_ICONS[careerTag] ?? "🎯";

    return (
        <section className="rounded-2xl border border-border/60 bg-surface/40 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-teal-700/40 bg-teal-500/10 text-2xl">
                        {careerEmoji}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${level.color}`}>{level.label}</span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                                {selectedKind === "STANDARD_SOFT_SKILLS" ? "Soft Skills · Always Free" : "IA Personalizada · Premium"}
                            </span>
                        </div>
                        <h1 className="mt-1 text-xl font-black text-foreground md:text-2xl">{path.title}</h1>
                    </div>
                </div>

                {/* Kind switcher */}
                <div className="flex gap-2 text-xs">
                    <button
                        onClick={() => onKindChange("STANDARD_SOFT_SKILLS")}
                        className={`rounded-full px-3 py-1.5 font-semibold transition ${selectedKind === "STANDARD_SOFT_SKILLS" ? "bg-accent text-background" : "bg-surface text-muted hover:text-foreground"}`}
                    >
                        Soft Skills
                    </button>
                    <button
                        onClick={() => onKindChange("AI_PERSONALIZED")}
                        className={`rounded-full px-3 py-1.5 font-semibold transition ${selectedKind === "AI_PERSONALIZED" ? "bg-accent text-background" : "bg-surface text-muted hover:text-foreground"}`}
                    >
                        IA Personalizada
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 flex flex-wrap gap-5 text-sm">
                <div className="flex items-center gap-2 text-muted">
                    <Layers className="h-4 w-4 text-accent" />
                    <span>{path.steps.length} etapas</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                    <Clock className="h-4 w-4 text-accent" />
                    <span>~{Math.round(totalMin / 60)}h{totalMin % 60 > 0 ? ` ${totalMin % 60}min` : ""} no total</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                    <Award className="h-4 w-4 text-accent" />
                    <span>{completedCount} concluídas</span>
                </div>
                {completionRate < 100 && (
                    <div className="flex items-center gap-2 text-teal-400">
                        <Flame className="h-4 w-4" />
                        <span>
                            {milestone.at - completionRate}% para o {milestone.label}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-border">
                <div
                    className={`h-full rounded-full bg-accent transition-all duration-700 ${recentlyCompleted ? "shadow-[0_0_20px_rgba(20,184,166,0.5)]" : ""}`}
                    style={{ width: `${completionRate}%` }}
                />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{completionRate}% concluído</span>
                <span className="flex items-center gap-1">
                    Próximo marco: {milestone.label} <ChevronRight className="h-3 w-3" />
                </span>
            </div>
        </section>
    );
}
