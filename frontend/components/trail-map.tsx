"use client";

import { Award, BookOpen, CheckSquare, ClipboardList, FileImage, FileText, Grip, Lock, MessageSquare, PlayCircle, Sparkles, Unlink2 } from "lucide-react";
import { motion } from "framer-motion";

import type { CareerPathStep } from "@/lib/types";

type TrailMapProps = {
    steps: CareerPathStep[];
    activeStepId?: string | null;
    onSelectStep: (step: CareerPathStep) => void;
};

function typeIcon(type: string | null) {
    switch (type) {
        case "COURSE":
            return <BookOpen className="h-4 w-4" />;
        case "CERTIFICATION":
            return <Award className="h-4 w-4" />;
        case "ARTICLE":
            return <FileText className="h-4 w-4" />;
        case "ACTION_TASK":
            return <CheckSquare className="h-4 w-4" />;
        case "VIDEO":
            return <PlayCircle className="h-4 w-4" />;
        case "QUIZ":
            return <ClipboardList className="h-4 w-4" />;
        case "DIAGRAM":
            return <FileImage className="h-4 w-4" />;
        case "INTERACTIVE_FORM":
            return <ClipboardList className="h-4 w-4" />;
        case "SCENARIO_BUILDER":
            return <Grip className="h-4 w-4" />;
        case "RULES_RADIAL":
            return <Sparkles className="h-4 w-4" />;
        case "MATCHING_GAME":
            return <Unlink2 className="h-4 w-4" />;
        case "DIALOGUE_SIMULATOR":
            return <MessageSquare className="h-4 w-4" />;
        default:
            return <BookOpen className="h-4 w-4" />;
    }
}

export function TrailMap({ steps, activeStepId, onSelectStep }: TrailMapProps) {
    return (
        <div className="relative mx-auto max-w-5xl px-2 pb-16 pt-4">
            <div className="absolute left-1/2 top-3 h-[calc(100%-1.5rem)] -translate-x-1/2 border-l-2 border-dashed border-teal-700/50" />
            <ul className="space-y-4">
                {steps.map((step, idx) => {
                    const isCompleted = step.status === "COMPLETED";
                    const isUnlocked = step.status === "UNLOCKED";
                    const isLocked = step.status === "LOCKED";
                    const canOpen = !isLocked;
                    const isFocused = activeStepId === step.id || (!activeStepId && isUnlocked);
                    const alignLeft = idx % 2 === 0;

                    return (
                        <motion.li
                            key={step.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="relative min-h-36"
                        >
                            <div className={`relative flex ${alignLeft ? "justify-start pr-24 lg:pr-72" : "justify-end pl-24 lg:pl-72"}`}>
                                <button
                                    type="button"
                                    disabled={!canOpen}
                                    onClick={() => onSelectStep(step)}
                                    className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 transition ${isCompleted
                                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                                        : isUnlocked
                                            ? "border-teal-300 bg-teal-500/20 text-teal-100 shadow-[0_0_32px_rgba(20,184,166,0.35)]"
                                            : "border-zinc-700 bg-zinc-900 text-zinc-500"
                                        } ${isFocused ? "scale-110" : "scale-100"} ${!canOpen ? "cursor-not-allowed opacity-70" : "hover:border-teal-300"}`}
                                >
                                    {isCompleted ? <CheckSquare className="h-5 w-5" /> : isLocked ? <Lock className="h-5 w-5" /> : typeIcon(step.content_type)}
                                </button>

                                <div className={`absolute top-1/2 z-20 w-64 -translate-y-1/2 ${alignLeft ? "left-24" : "right-24"} ${isFocused ? "block" : "hidden lg:block opacity-75"}`}>
                                    <div className={`rounded-2xl border p-4 shadow-2xl ${isFocused ? "border-teal-500/60 bg-zinc-950/95" : "border-zinc-800 bg-zinc-950/75"}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs uppercase tracking-wide text-zinc-500">Etapa {step.order_index + 1}</p>
                                            {isUnlocked && <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[11px] text-teal-200">Voce esta aqui</span>}
                                            {isCompleted && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">Concluida</span>}
                                        </div>
                                        <h3 className="mt-2 text-sm font-semibold text-zinc-100">{step.title}</h3>
                                        <div className="mt-3 h-1.5 rounded-full bg-zinc-800">
                                            <div className={`h-full rounded-full ${isCompleted ? "bg-emerald-400 w-full" : isUnlocked ? "bg-teal-400 w-2/3" : "bg-zinc-700 w-1/5"}`} />
                                        </div>
                                        <p className={`mt-3 text-xs ${step.is_description_locked ? "blur-[2px] select-none text-zinc-500" : "text-zinc-300"}`}>
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.li>
                    );
                })}
            </ul>
        </div>
    );
}
