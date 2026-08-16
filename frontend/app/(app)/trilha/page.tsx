"use client";

import { ExternalLink, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { TrailMap } from "@/components/trail-map";
import { extractApiMessage, useBackendApi } from "@/lib/api";
import type { CareerPath, CareerPathStep } from "@/lib/types";

export default function TrailPage() {
    const api = useBackendApi();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [path, setPath] = useState<CareerPath | null>(null);
    const [selectedStep, setSelectedStep] = useState<CareerPathStep | null>(null);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const result = await api.getMyCareerPath();
                if (!cancelled) {
                    setPath(result);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(extractApiMessage(e, "Nao foi possivel carregar sua trilha."));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [api]);

    const completionRate = useMemo(() => {
        if (!path || path.steps.length === 0) {
            return 0;
        }
        const completedCount = path.steps.filter((step) => step.status === "COMPLETED").length;
        return Math.round((completedCount / path.steps.length) * 100);
    }, [path]);

    async function handleCompleteStep() {
        if (!selectedStep) {
            return;
        }

        setCompleting(true);
        setError(null);
        try {
            const result = await api.completeStep(selectedStep.id);
            const updated = await api.getMyCareerPath();
            setPath(updated);

            if (result.next_step_blocked_by_paywall) {
                router.push("/paywall");
                return;
            }

            setSelectedStep(updated.steps.find((step) => step.id === selectedStep.id) ?? null);
        } catch (e) {
            setError(extractApiMessage(e, "Nao foi possivel concluir a etapa."));
        } finally {
            setCompleting(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-2xl bg-zinc-900/60" />
                <div className="h-80 animate-pulse rounded-2xl bg-zinc-900/60" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    if (!path) {
        return <p className="text-sm text-zinc-400">Nenhuma trilha encontrada.</p>;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Mapa da trilha</p>
                <h1 className="mt-2 text-2xl font-black text-zinc-100">{path.title}</h1>
                <p className="mt-2 text-sm text-zinc-400">Progresso total: {completionRate}%</p>
            </section>

            <TrailMap steps={path.steps} onSelectStep={setSelectedStep} />

            <AnimatePresence>
                {selectedStep && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
                    >
                        <motion.div
                            initial={{ scale: 0.96, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.98, y: 10 }}
                            className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-zinc-500">Etapa {selectedStep.order_index + 1}</p>
                                    <h2 className="mt-1 text-xl font-bold text-zinc-100">{selectedStep.title}</h2>
                                </div>
                                <button onClick={() => setSelectedStep(null)} className="text-sm text-zinc-400 hover:text-zinc-200">
                                    Fechar
                                </button>
                            </div>

                            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                                {selectedStep.is_description_locked ? (
                                    <p className="flex items-center gap-2 text-sm text-zinc-400">
                                        <Lock className="h-4 w-4" />
                                        Conteudo bloqueado para assinantes.
                                    </p>
                                ) : (
                                    <p className="text-sm text-zinc-200">{selectedStep.description}</p>
                                )}
                            </div>

                            {selectedStep.external_url && !selectedStep.is_description_locked && (
                                <a
                                    href={selectedStep.external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200"
                                >
                                    Abrir material externo <ExternalLink className="h-4 w-4" />
                                </a>
                            )}

                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStep(null)}
                                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCompleteStep}
                                    disabled={completing || selectedStep.status !== "UNLOCKED"}
                                    className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {completing ? "Concluindo..." : "Marcar como concluida"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
