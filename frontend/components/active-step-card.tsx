"use client";

import { ArrowRight, BookOpen, CheckSquare, Clock, ClipboardList, FileText, Grip, MessageSquare, PlayCircle, Sparkles, Unlink2 } from "lucide-react";

import type { CareerPathStep } from "@/lib/types";

type ActiveStepCardProps = {
    step: CareerPathStep;
    pathKind: string;
    onStart: (step: CareerPathStep) => void;
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
    VIDEO: "Vídeo",
    QUIZ: "Quiz",
    INTERACTIVE_FORM: "Reflexão",
    SCENARIO_BUILDER: "Cenário prático",
    RULES_RADIAL: "Mapa de regras",
    MATCHING_GAME: "Jogo de associação",
    DIALOGUE_SIMULATOR: "Simulador de conversa",
    DIAGRAM: "Diagrama",
    ARTICLE: "Artigo",
    COURSE: "Curso",
    CERTIFICATION: "Certificação",
    ACTION_TASK: "Tarefa prática",
};

function stepIcon(type: string | null) {
    switch (type) {
        case "VIDEO": return <PlayCircle className="h-5 w-5" />;
        case "QUIZ": return <ClipboardList className="h-5 w-5" />;
        case "ARTICLE": return <FileText className="h-5 w-5" />;
        case "ACTION_TASK": return <CheckSquare className="h-5 w-5" />;
        case "SCENARIO_BUILDER": return <Grip className="h-5 w-5" />;
        case "RULES_RADIAL": return <Sparkles className="h-5 w-5" />;
        case "MATCHING_GAME": return <Unlink2 className="h-5 w-5" />;
        case "DIALOGUE_SIMULATOR": return <MessageSquare className="h-5 w-5" />;
        default: return <BookOpen className="h-5 w-5" />;
    }
}

function estimateStepMinutes(step: CareerPathStep): number {
    const PER_TYPE: Record<string, number> = {
        VIDEO: 8, QUIZ: 5, INTERACTIVE_FORM: 7, SCENARIO_BUILDER: 8,
        RULES_RADIAL: 5, MATCHING_GAME: 6, DIALOGUE_SIMULATOR: 10,
        DIAGRAM: 5, ARTICLE: 10, COURSE: 15, CERTIFICATION: 20, ACTION_TASK: 10,
    };
    return (PER_TYPE[step.content_type ?? ""] ?? 5) * Math.max(1, step.chain_total_stages);
}

export function ActiveStepCard({ step, pathKind, onStart }: ActiveStepCardProps) {
    const stagesDone = step.chain_items.findIndex((item) => item.id === step.current_content_item_id);
    const currentStage = stagesDone >= 0 ? stagesDone : 0;
    const totalStages = Math.max(1, step.chain_total_stages);
    const hasProgress = currentStage > 0;
    const stageLabel = totalStages > 1 ? `${totalStages} estágios` : "1 estágio";
    const minutes = estimateStepMinutes(step);
    const typeName = CONTENT_TYPE_LABEL[step.content_type ?? ""] ?? "Atividade";

    const ctaLabel = hasProgress ? "Continuar" : pathKind === "STANDARD_SOFT_SKILLS" ? "Começar" : "Iniciar etapa";

    return (
        <section className="relative overflow-hidden rounded-2xl border border-teal-600/40 bg-gradient-to-br from-teal-500/10 to-surface/30 p-5 shadow-[0_0_40px_rgba(20,184,166,0.08)] md:p-6">
            {/* "Você está aqui" badge */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300 ring-1 ring-teal-500/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
                Você está aqui
            </div>

            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-teal-500/40 bg-teal-500/20 text-teal-300">
                    {stepIcon(step.content_type)}
                </div>
                <div className="min-w-0 flex-1 pr-28">
                    <p className="text-xs uppercase tracking-wide text-teal-400">
                        Etapa {step.order_index + 1} · {typeName}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-foreground">{step.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> {stageLabel}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> ~{minutes} min
                        </span>
                    </p>
                </div>
            </div>

            {/* Chain progress */}
            {totalStages > 1 && (
                <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                        <span>Estágios concluídos</span>
                        <span>{currentStage}/{totalStages}</span>
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: totalStages }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-all ${i < currentStage ? "bg-teal-400" : i === currentStage && hasProgress ? "bg-teal-400/50" : "bg-border"}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {!step.is_description_locked && (
                <p className="mt-3 line-clamp-2 text-sm text-muted">{step.description}</p>
            )}

            <button
                type="button"
                onClick={() => onStart(step)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-background hover:bg-accent-hover transition"
            >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
            </button>
        </section>
    );
}
