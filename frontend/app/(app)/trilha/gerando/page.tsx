"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleDashed, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { extractApiMessage } from "@/lib/api";
import { useMyCareerPathsQuery } from "@/lib/backend-queries";
import type { CareerPath } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 120000;
const STEP_DURATION_MS = 1700;
const HOLD_VARIANTS = [
    "So mais um instante...",
    "Ajustando os ultimos detalhes...",
    "Lapidando sua trilha final...",
];
const GENERATION_STEPS = [
    "Analisando seu objetivo...",
    "Buscando o melhor conteudo pra voce...",
    "Montando a sequencia ideal...",
    "Adicionando desafios praticos...",
    "Quase la...",
];

function lcg(n: number): number {
    return ((n * 1664525 + 1013904223) >>> 0) / 0x100000000;
}

const STARS = Array.from({ length: 90 }, (_, i) => ({
    x: lcg(i * 3) * 100,
    y: lcg(i * 7 + 1) * 100,
    size: lcg(i * 11 + 2) < 0.6 ? 1 : 2,
    opacity: 0.2 + lcg(i * 13 + 5) * 0.5,
    delay: lcg(i * 17 + 4) * 2,
    duration: 2 + lcg(i * 19 + 3) * 3,
}));

export default function TrailGeneratingPage() {
    const pathsQuery = useMyCareerPathsQuery();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [path, setPath] = useState<CareerPath | null>(null);
    const [completedSteps, setCompletedSteps] = useState(0);
    const [visibleStepIndex, setVisibleStepIndex] = useState(0);
    const [holdMessageIndex, setHoldMessageIndex] = useState(0);
    const [backendReadyPathId, setBackendReadyPathId] = useState<string | null>(null);
    const startedAtRef = useRef<number | null>(null);
    const sawGeneratingRef = useRef(false);
    const redirectedRef = useRef(false);
    const expectedCareerPathId = searchParams.get("career_path_id");
    const minSequenceMs = GENERATION_STEPS.length * STEP_DURATION_MS;

    useEffect(() => {
        const startedAt = Date.now();
        startedAtRef.current = startedAt;

        const intervalId = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const finishedCount = Math.min(GENERATION_STEPS.length, Math.floor(elapsed / STEP_DURATION_MS));
            setCompletedSteps(finishedCount);
            setVisibleStepIndex(Math.min(GENERATION_STEPS.length - 1, finishedCount));

            if (elapsed > minSequenceMs) {
                const holdTick = Math.floor((elapsed - minSequenceMs) / STEP_DURATION_MS);
                setHoldMessageIndex(holdTick % HOLD_VARIANTS.length);
            }
        }, 200);

        return () => clearInterval(intervalId);
    }, [minSequenceMs]);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let cancelled = false;

        async function checkStatus() {
            try {
                const result = (await pathsQuery.mutate()) ?? [];
                if (cancelled) {
                    return;
                }

                const aiPath = result.find((path) => path.kind === "AI_PERSONALIZED");
                if (!aiPath) {
                    router.replace("/dashboard");
                    return;
                }

                if (expectedCareerPathId && aiPath.id !== expectedCareerPathId) {
                    return;
                }

                setPath(aiPath);

                if (aiPath.status === "GENERATING") {
                    sawGeneratingRef.current = true;
                }

                if (aiPath.status === "ACTIVE") {
                    const alreadyWasGenerating = sawGeneratingRef.current;
                    if (!alreadyWasGenerating && !expectedCareerPathId) {
                        router.replace(`/trilha/${aiPath.id}`);
                        return;
                    }
                    setBackendReadyPathId(aiPath.id);
                }
            } catch (e) {
                if (cancelled) {
                    return;
                }
                setError(extractApiMessage(e, "Nao foi possivel consultar a geracao da trilha."));
            }
        }

        void checkStatus();
        intervalId = setInterval(() => {
            void checkStatus();
        }, POLL_INTERVAL_MS);

        timeoutId = setTimeout(() => {
            if (cancelled) {
                return;
            }

            if (startedAtRef.current !== null && Date.now() - startedAtRef.current >= TIMEOUT_MS) {
                setError("A geracao demorou mais que o esperado. Tente novamente em instantes.");
            }
        }, TIMEOUT_MS);

        return () => {
            cancelled = true;
            if (intervalId) {
                clearInterval(intervalId);
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [expectedCareerPathId, pathsQuery.mutate, router]);

    useEffect(() => {
        if (!backendReadyPathId || redirectedRef.current) {
            return;
        }
        const startedAt = startedAtRef.current;
        if (startedAt === null) {
            return;
        }

        const elapsed = Date.now() - startedAt;
        const sequenceComplete = elapsed >= minSequenceMs && completedSteps >= GENERATION_STEPS.length;

        if (sequenceComplete) {
            redirectedRef.current = true;
            router.replace(`/trilha/${backendReadyPathId}`);
        }
    }, [backendReadyPathId, completedSteps, minSequenceMs, router]);

    const currentLeadLine = GENERATION_STEPS[Math.min(visibleStepIndex, GENERATION_STEPS.length - 1)] ?? GENERATION_STEPS[0];
    const sequenceDone = completedSteps >= GENERATION_STEPS.length;
    const waitingBackend = sequenceDone && !backendReadyPathId;

    return (
        <div className="app-card relative mx-auto min-h-[72vh] max-w-3xl overflow-hidden bg-background/85 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 -top-16 h-64 w-64 rounded-full bg-accent-purple/20 blur-3xl" />
                <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent-mint/16 blur-3xl" />
                {STARS.map((star, index) => (
                    <motion.span
                        key={index}
                        className="absolute rounded-full bg-accent-blue/80 dark:bg-accent-purple"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                        }}
                        animate={{ opacity: [star.opacity, star.opacity * 0.25, star.opacity] }}
                        transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: "easeInOut" }}
                    />
                ))}
            </div>

            <div className="relative z-10 flex min-h-[66vh] flex-col justify-center">
                <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-blue/45 bg-accent-blue/12 text-accent-blue">
                        <Sparkles className="h-7 w-7" />
                    </div>
                    <h1 className="mt-5 text-2xl font-black text-foreground sm:text-3xl">Construindo sua trilha personalizada</h1>
                    <p className="mt-2 text-sm text-muted">Estamos preparando uma jornada sob medida para o seu objetivo profissional.</p>
                </div>

                <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-border bg-surface/80 p-4 sm:p-5">
                    <div className="space-y-3">
                        {GENERATION_STEPS.map((line, index) => {
                            const isDone = index < completedSteps;
                            const isCurrent = index === Math.min(visibleStepIndex, GENERATION_STEPS.length - 1) && !isDone;

                            return (
                                <div
                                    key={line}
                                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${isDone
                                        ? "border-accent-mint/40 bg-accent-mint/12"
                                        : isCurrent
                                            ? "border-accent-blue/45 bg-accent-blue/12"
                                            : "border-border bg-background/70"
                                        }`}
                                >
                                    <span className="flex h-5 w-5 items-center justify-center">
                                        {isDone ? (
                                            <CheckCircle2 className="h-5 w-5 text-accent-mint" />
                                        ) : (
                                            <CircleDashed className={`h-5 w-5 ${isCurrent ? "animate-spin text-accent-blue" : "text-muted"}`} />
                                        )}
                                    </span>
                                    <p className={`text-sm ${isDone ? "text-accent-mint" : isCurrent ? "text-accent-blue" : "text-muted"}`}>{line}</p>
                                </div>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.p
                            key={waitingBackend ? `hold-${holdMessageIndex}` : `lead-${visibleStepIndex}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.22 }}
                            className="mt-4 text-center text-sm text-muted"
                        >
                            {waitingBackend ? HOLD_VARIANTS[holdMessageIndex] : currentLeadLine}
                        </motion.p>
                    </AnimatePresence>
                </div>

                <div className="mx-auto mt-4 w-full max-w-2xl rounded-xl border border-border bg-background/70 p-3 text-xs text-muted">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Status backend: {path?.status ?? "GENERATING"}</span>
                        <span>{backendReadyPathId ? "Trilha pronta. Finalizando experiencia visual..." : "Sincronizando progresso..."}</span>
                    </div>
                </div>
            </div>

            {error && <p className="relative z-10 mt-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        </div>
    );
}
