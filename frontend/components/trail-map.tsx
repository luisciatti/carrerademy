"use client";

import { Award, BookOpen, CheckSquare, FileText, Lock } from "lucide-react";
import { motion } from "framer-motion";

import type { CareerPathStep } from "@/lib/types";

type TrailMapProps = {
    steps: CareerPathStep[];
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
        default:
            return <BookOpen className="h-4 w-4" />;
    }
}

export function TrailMap({ steps, onSelectStep }: TrailMapProps) {
    return (
        <div className="relative mx-auto max-w-3xl px-2 pb-10 pt-4">
            <div className="absolute left-[31px] top-3 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-violet-400/60 via-violet-700/30 to-zinc-800" />
            <ul className="space-y-4">
                {steps.map((step, idx) => {
                    const isCompleted = step.status === "COMPLETED";
                    const isUnlocked = step.status === "UNLOCKED";
                    const isLocked = step.status === "LOCKED";
                    const canOpen = !isLocked;

                    return (
                        <motion.li
                            key={step.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="relative"
                        >
                            <button
                                type="button"
                                disabled={!canOpen}
                                onClick={() => onSelectStep(step)}
                                className={`group w-full rounded-2xl border p-4 text-left transition ${isCompleted
                                        ? "border-emerald-500/60 bg-emerald-600/10"
                                        : isUnlocked
                                            ? "border-violet-500/60 bg-violet-600/10 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                                            : "border-zinc-700 bg-zinc-900/60"
                                    } ${!canOpen ? "cursor-not-allowed opacity-80" : "hover:border-violet-400"}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full border ${isCompleted
                                                ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                                                : isUnlocked
                                                    ? "border-violet-300 bg-violet-500/20 text-violet-200"
                                                    : "border-zinc-600 bg-zinc-800 text-zinc-400"
                                            }`}
                                    >
                                        {isLocked ? <Lock className="h-4 w-4" /> : typeIcon(step.content_type)}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs uppercase tracking-wide text-zinc-400">Etapa {step.order_index + 1}</p>
                                            {isUnlocked && <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">Voce esta aqui</span>}
                                            {isCompleted && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">Concluida</span>}
                                        </div>
                                        <h3 className="mt-1 text-base font-semibold text-zinc-100">{step.title}</h3>
                                        <p className={`mt-2 text-sm ${step.is_description_locked ? "blur-[2px] select-none text-zinc-500" : "text-zinc-300"}`}>
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </motion.li>
                    );
                })}
            </ul>
        </div>
    );
}
