"use client";

import {
    Award, BookOpen, CheckSquare, ClipboardList, FileImage, FileText,
    Grip, Lock, MessageSquare, PlayCircle, Sparkles, Unlink2, Zap,
} from "lucide-react";
import { motion } from "framer-motion";

import { StepCard, type StepCardVariant } from "@/components/step-card";
import type { CareerPathStep } from "@/lib/types";

type TrailMapProps = {
    steps: CareerPathStep[];
    activeStepId?: string | null;
    onSelectStep: (step: CareerPathStep) => void;
};

const BONUS_TYPES = new Set(["SCENARIO_BUILDER", "MATCHING_GAME", "DIALOGUE_SIMULATOR", "RULES_RADIAL"]);

const BONUS_COLORS: Record<string, { ring: string; bg: string; text: string }> = {
    DIALOGUE_SIMULATOR: { ring: "border-accent-purple/60", bg: "bg-accent-purple/15", text: "text-accent-purple" },
    SCENARIO_BUILDER: { ring: "border-accent-coral/60", bg: "bg-accent-coral/15", text: "text-accent-coral" },
    MATCHING_GAME: { ring: "border-accent-blue/60", bg: "bg-accent-blue/15", text: "text-accent-blue" },
    RULES_RADIAL: { ring: "border-accent-mint/60", bg: "bg-accent-mint/15", text: "text-accent-mint" },
};

function nodeIcon(type: string | null, small?: boolean) {
    const cls = small ? "h-3.5 w-3.5" : "h-4 w-4";
    switch (type) {
        case "COURSE": return <BookOpen className={cls} />;
        case "CERTIFICATION": return <Award className={cls} />;
        case "ARTICLE": return <FileText className={cls} />;
        case "ACTION_TASK": return <CheckSquare className={cls} />;
        case "VIDEO": return <PlayCircle className={cls} />;
        case "QUIZ": return <ClipboardList className={cls} />;
        case "DIAGRAM": return <FileImage className={cls} />;
        case "INTERACTIVE_FORM": return <ClipboardList className={cls} />;
        case "SCENARIO_BUILDER": return <Grip className={cls} />;
        case "RULES_RADIAL": return <Sparkles className={cls} />;
        case "MATCHING_GAME": return <Unlink2 className={cls} />;
        case "DIALOGUE_SIMULATOR": return <MessageSquare className={cls} />;
        default: return <BookOpen className={cls} />;
    }
}

function deriveVariant(step: CareerPathStep, isBonus: boolean, isActive: boolean): StepCardVariant {
    if (step.status === "COMPLETED") return "completed";
    if (isBonus && step.status !== "LOCKED") return "bonus";
    if (step.status === "UNLOCKED" && isActive) return "current";
    if (step.status === "UNLOCKED") return "available";
    return "locked";
}

export function TrailMap({ steps, activeStepId, onSelectStep }: TrailMapProps) {
    return (
        <div className="relative mx-auto max-w-5xl px-2 pb-16 pt-4">
            {/* Vertical spine */}
            <div
                aria-hidden
                className="absolute left-1/2 top-3 h-[calc(100%-1.5rem)] -translate-x-1/2 border-l-2 border-dashed border-border/60"
            />

            <ul className="space-y-3">
                {steps.map((step, idx) => {
                    const isCompleted = step.status === "COMPLETED";
                    const isUnlocked = step.status === "UNLOCKED";
                    const isLocked = step.status === "LOCKED";
                    const isBonus = BONUS_TYPES.has(step.content_type ?? "");
                    const isActive = activeStepId === step.id;
                    const canOpen = !isLocked;
                    const alignLeft = idx % 2 === 0;
                    const bonusColors = BONUS_COLORS[step.content_type ?? ""];

                    const variant = deriveVariant(step, isBonus, isActive);

                    const nodeSize = isBonus ? "h-11 w-11" : "h-16 w-16";
                    const nodeBorder = isCompleted
                        ? "border-accent-mint/60 bg-accent-mint/20 text-accent-mint"
                        : isUnlocked
                            ? "border-accent-blue/60 bg-accent-blue/20 text-accent-blue shadow-[0_0_28px_rgba(75,123,236,0.34)]"
                            : step.is_description_locked
                                ? "border-accent-coral/55 bg-accent-coral/12 text-accent-coral"
                                : isBonus && bonusColors
                                    ? `${bonusColors.ring} ${bonusColors.bg} ${bonusColors.text}`
                                    : "border-border bg-surface text-muted";

                    const nodeHover = !canOpen
                        ? "cursor-not-allowed opacity-60"
                        : isUnlocked
                            ? "cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(75,123,236,0.3)]"
                            : "cursor-pointer hover:scale-105";

                    const cardMaxW = isBonus
                        ? "max-w-[12rem] sm:max-w-[14rem]"
                        : "max-w-[13rem] sm:max-w-[16rem] xl:max-w-[18rem]";

                    const cardSlot = canOpen ? (
                        <button
                            type="button"
                            onClick={() => onSelectStep(step)}
                            className={`w-full text-left ${cardMaxW}`}
                        >
                            <StepCard step={step} variant={variant} isActive={isActive} />
                        </button>
                    ) : (
                        <div className={`w-full ${cardMaxW}`}>
                            <StepCard step={step} variant={variant} isActive={isActive} />
                        </div>
                    );

                    return (
                        <motion.li
                            key={step.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.035 }}
                        >
                            {/*
                             * 3-column: [left-card | node | right-card]
                             * Both flex-1 columns are equal, so the node always sits at 50%
                             * — aligned with the absolute spine line behind it.
                             */}
                            <div className="flex items-center">
                                <div className="flex flex-1 justify-end pr-3 sm:pr-4">
                                    {alignLeft && cardSlot}
                                </div>

                                <button
                                    type="button"
                                    disabled={!canOpen}
                                    onClick={() => canOpen && onSelectStep(step)}
                                    className={`relative z-10 flex flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 ${nodeSize} ${nodeBorder} ${isActive ? "scale-110" : "scale-100"} ${nodeHover}`}
                                >
                                    {isCompleted
                                        ? <CheckSquare className="h-5 w-5" />
                                        : isLocked
                                            ? <Lock className="h-4 w-4" />
                                            : nodeIcon(step.content_type, isBonus)}

                                    {isBonus && !isCompleted && !isLocked && (
                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-black text-background">
                                            <Zap className="h-2.5 w-2.5" />
                                        </span>
                                    )}
                                    {step.is_description_locked && isLocked && (
                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-coral text-[8px] font-black text-white">
                                            $
                                        </span>
                                    )}
                                </button>

                                <div className="flex flex-1 justify-start pl-3 sm:pl-4">
                                    {!alignLeft && cardSlot}
                                </div>
                            </div>
                        </motion.li>
                    );
                })}
            </ul>
        </div>
    );
}
