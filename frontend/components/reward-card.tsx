"use client";

import { ArrowRight, Award, BookOpen, CheckSquare, Clock, Grip, MessageSquare, Sparkles, Star, Unlink2, Zap } from "lucide-react";
import { useState } from "react";

import type { CareerPathStep } from "@/lib/types";

type RewardCardProps = {
    step: CareerPathStep;
    onAccept: () => void;
    onClose: () => void;
};

const FLAVOR: Record<string, string> = {
    VIDEO: "Comece com um vídeo curto que vai mudar como você aborda isso na prática.",
    QUIZ: "Teste o que você realmente sabe — não o que acha que sabe.",
    INTERACTIVE_FORM: "Reflita sobre uma situação real sua. Ninguém vê, mas você vai sentir a diferença.",
    SCENARIO_BUILDER: "Arraste, organize, decida. A prática começa aqui.",
    RULES_RADIAL: "Explore os princípios que os melhores profissionais aplicam sem pensar.",
    MATCHING_GAME: "Conecte situações e respostas — rapidez e precisão contam.",
    DIALOGUE_SIMULATOR: "Prepare-se para conduzir uma conversa que pode mudar como sua equipe te vê.",
    ARTICLE: "Leitura direta ao ponto — sem enrolação, só o essencial.",
    DIAGRAM: "Uma imagem que vale mais que uma hora de aula.",
    ACTION_TASK: "Tarefa prática para aplicar agora, não depois.",
    COURSE: "Mergulhe fundo neste tema com um curso guiado.",
    CERTIFICATION: "Dê um passo rumo a uma certificação reconhecida.",
};

const TYPE_LABELS: Record<string, string> = {
    VIDEO: "Vídeo", QUIZ: "Quiz", INTERACTIVE_FORM: "Reflexão",
    SCENARIO_BUILDER: "Cenário prático", RULES_RADIAL: "Mapa de regras",
    MATCHING_GAME: "Jogo de associação", DIALOGUE_SIMULATOR: "Simulador de conversa",
    DIAGRAM: "Diagrama", ARTICLE: "Artigo",
    COURSE: "Curso", CERTIFICATION: "Certificação", ACTION_TASK: "Tarefa prática",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
    VIDEO: <Sparkles className="h-8 w-8 text-teal-300" />,
    QUIZ: <CheckSquare className="h-8 w-8 text-teal-300" />,
    INTERACTIVE_FORM: <BookOpen className="h-8 w-8 text-teal-300" />,
    SCENARIO_BUILDER: <Grip className="h-8 w-8 text-amber-300" />,
    RULES_RADIAL: <Sparkles className="h-8 w-8 text-teal-300" />,
    MATCHING_GAME: <Unlink2 className="h-8 w-8 text-sky-300" />,
    DIALOGUE_SIMULATOR: <MessageSquare className="h-8 w-8 text-violet-300" />,
    ARTICLE: <BookOpen className="h-8 w-8 text-teal-300" />,
    ACTION_TASK: <Zap className="h-8 w-8 text-amber-300" />,
};

const ICON_BG: Record<string, string> = {
    SCENARIO_BUILDER: "bg-amber-500/15 border-amber-500/30",
    MATCHING_GAME: "bg-sky-500/15 border-sky-500/30",
    DIALOGUE_SIMULATOR: "bg-violet-500/15 border-violet-500/30",
    ACTION_TASK: "bg-amber-500/15 border-amber-500/30",
};

function estimateMinutes(step: CareerPathStep): number {
    const PER_TYPE: Record<string, number> = {
        VIDEO: 8, QUIZ: 5, INTERACTIVE_FORM: 7, SCENARIO_BUILDER: 8,
        RULES_RADIAL: 5, MATCHING_GAME: 6, DIALOGUE_SIMULATOR: 10,
        DIAGRAM: 5, ARTICLE: 10, COURSE: 15, CERTIFICATION: 20, ACTION_TASK: 10,
    };
    return (PER_TYPE[step.content_type ?? ""] ?? 5) * Math.max(1, step.chain_total_stages);
}

export function RewardCard({ step, onAccept, onClose }: RewardCardProps) {
    const [accepting, setAccepting] = useState(false);
    const ct = step.content_type ?? "";
    const flavor = FLAVOR[ct] ?? "Uma atividade pensada especificamente para o seu momento de carreira.";
    const typeLabel = TYPE_LABELS[ct] ?? "Atividade";
    const icon = TYPE_ICONS[ct] ?? <Star className="h-8 w-8 text-teal-300" />;
    const iconBg = ICON_BG[ct] ?? "bg-teal-500/15 border-teal-500/30";
    const minutes = estimateMinutes(step);
    const stages = Math.max(1, step.chain_total_stages);

    function handleAccept() {
        setAccepting(true);
        // Brief delay for fade-out animation before opening the activity
        setTimeout(() => onAccept(), 280);
    }

    return (
        <div
            className={`flex flex-col gap-6 transition-opacity duration-300 ${accepting ? "opacity-0" : "opacity-100"}`}
        >
            {/* Card header — icon + type label */}
            <div className="flex flex-col items-center gap-3 text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 ${iconBg}`}>
                    {icon}
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                    {typeLabel}
                </span>
                <h2 className="text-xl font-black text-foreground">{step.title}</h2>
                <p className="max-w-md text-sm text-muted">{flavor}</p>
            </div>

            {/* "Você vai ganhar" block */}
            <div className="rounded-2xl border border-teal-700/30 bg-teal-500/5 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-400">
                    Você vai ganhar
                </p>
                <ul className="space-y-2.5">
                    <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-300">
                            <Zap className="h-3 w-3" />
                        </span>
                        <span className="text-sm text-foreground">
                            <span className="font-semibold text-teal-300">+{stages * 12} XP</span> no seu perfil de carreira
                        </span>
                    </li>
                    {step.reward_description && (
                        <li className="flex items-start gap-3">
                            <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                            <span className="text-sm text-foreground">
                                Progresso em: <span className="font-semibold text-amber-300">{step.reward_description}</span>
                            </span>
                        </li>
                    )}
                    <li className="flex items-start gap-3">
                        <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400" />
                        <span className="text-sm text-foreground">
                            Desbloqueio da próxima etapa do mapa
                        </span>
                    </li>
                </ul>
            </div>

            {/* Time & stages info */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-accent" />
                    ~{minutes} minutos
                </span>
                <span className="h-3 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-accent" />
                    {stages === 1 ? "1 estágio" : `${stages} estágios encadeados`}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:text-foreground"
                >
                    Voltar ao mapa
                </button>
                <button
                    type="button"
                    onClick={handleAccept}
                    disabled={accepting}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-background transition hover:bg-accent-hover disabled:opacity-60"
                >
                    Aceitar desafio <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
