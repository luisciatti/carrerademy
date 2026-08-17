"use client";

import { ExternalLink, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActivityModal } from "@/components/activity-modal";
import { DialogueSimulator } from "@/components/dialogue-simulator";
import { MatchingGame } from "@/components/matching-game";
import { RulesRadial } from "@/components/rules-radial";
import { ScenarioBuilder } from "@/components/scenario-builder";
import { TrailMap } from "@/components/trail-map";
import { extractApiMessage, useBackendApi } from "@/lib/api";
import type {
    ApiContentType,
    CareerPath,
    CareerPathKind,
    CareerPathStep,
    ContentChainItem,
    DialogueSchema,
    FormSchema,
    MatchingSchema,
    QuizSchema,
    RulesRadialSchema,
    ScenarioBuilderSchema,
} from "@/lib/types";

const INTERSTITIAL_KEY = "careerademy.softskills.completion-count";

export default function TrailPage() {
    const api = useBackendApi();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paths, setPaths] = useState<CareerPath[]>([]);
    const [selectedStep, setSelectedStep] = useState<CareerPathStep | null>(null);
    const [completing, setCompleting] = useState(false);
    const [interactionResolved, setInteractionResolved] = useState<Record<string, boolean>>({});
    const [recentlyCompletedStepId, setRecentlyCompletedStepId] = useState<string | null>(null);
    const [completionSummaryOpen, setCompletionSummaryOpen] = useState(false);
    const [showInlineUpsell, setShowInlineUpsell] = useState(false);
    const [activeContentOverrideByStep, setActiveContentOverrideByStep] = useState<Record<string, string>>({});
    const [interstitialMessage, setInterstitialMessage] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<number, number>>>({});
    const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, string>>>({});

    const selectedKind = (searchParams.get("kind") as CareerPathKind | null) ?? "STANDARD_SOFT_SKILLS";

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const result = await api.getMyCareerPaths();
                if (!cancelled) {
                    setPaths(result);
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

    const path = useMemo(() => {
        return paths.find((item) => item.kind === selectedKind) ?? paths[0] ?? null;
    }, [paths, selectedKind]);

    useEffect(() => {
        if (path?.kind === "AI_PERSONALIZED" && path.status === "GENERATING") {
            router.replace("/trilha/gerando");
        }
    }, [path, router]);

    const completionRate = useMemo(() => {
        if (!path || path.steps.length === 0) {
            return 0;
        }
        const completedCount = path.steps.filter((step) => step.status === "COMPLETED").length;
        return Math.round((completedCount / path.steps.length) * 100);
    }, [path]);

    const selectedChain = useMemo(() => {
        if (!selectedStep) {
            return [] as ContentChainItem[];
        }
        return selectedStep.chain_items.length > 0
            ? selectedStep.chain_items
            : buildLegacySingleStage(selectedStep);
    }, [selectedStep]);

    const currentChainItemId = useMemo(() => {
        if (!selectedStep || selectedChain.length === 0) {
            return null;
        }
        return activeContentOverrideByStep[selectedStep.id] ?? selectedStep.current_content_item_id ?? selectedChain[0].id;
    }, [activeContentOverrideByStep, selectedChain, selectedStep]);

    const currentChainIndex = useMemo(() => {
        if (!currentChainItemId) {
            return 0;
        }
        const index = selectedChain.findIndex((item) => item.id === currentChainItemId);
        return index >= 0 ? index : 0;
    }, [currentChainItemId, selectedChain]);

    const currentChainItem = selectedChain[currentChainIndex] ?? null;

    async function handleAdvanceStage() {
        if (!selectedStep || !currentChainItemId) {
            return;
        }

        setCompleting(true);
        setError(null);
        try {
            const result = await api.completeStep(selectedStep.id, currentChainItemId);
            const updated = await api.getMyCareerPaths();
            setPaths(updated);

            const updatedPath = updated.find((item) => item.kind === selectedKind) ?? null;
            const updatedStep = updatedPath?.steps.find((step) => step.id === selectedStep.id) ?? null;

            if (result.next_step_blocked_by_paywall) {
                router.push("/paywall");
                return;
            }

            if (!result.completed) {
                if (result.current_content_item_id) {
                    setActiveContentOverrideByStep((prev) => ({ ...prev, [selectedStep.id]: result.current_content_item_id as string }));
                }
                setSelectedStep(updatedStep);
                return;
            }

            setRecentlyCompletedStepId(selectedStep.id);
            setCompletionSummaryOpen(true);
            setShowInlineUpsell(true);
            setSelectedStep(updatedStep);

            if (updatedPath?.kind === "STANDARD_SOFT_SKILLS") {
                registerSoftSkillsCompletion();
            }
        } catch (e) {
            setError(extractApiMessage(e, "Nao foi possivel concluir a etapa."));
        } finally {
            setCompleting(false);
        }
    }

    useEffect(() => {
        if (!recentlyCompletedStepId) {
            return;
        }
        const timeoutId = window.setTimeout(() => setRecentlyCompletedStepId(null), 1800);
        return () => window.clearTimeout(timeoutId);
    }, [recentlyCompletedStepId]);

    function registerSoftSkillsCompletion() {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(INTERSTITIAL_KEY) : null;
        const current = raw ? Number.parseInt(raw, 10) || 0 : 0;
        const next = current + 1;
        window.localStorage.setItem(INTERSTITIAL_KEY, String(next));
        if (next % 3 === 0) {
            setInterstitialMessage("Seu progresso gratuito esta consistente. Na trilha por IA, estas atividades seriam adaptadas ao seu cargo-alvo informado no onboarding.");
        }
    }

    function closeModal() {
        setSelectedStep(null);
        setCompletionSummaryOpen(false);
        setShowInlineUpsell(false);
    }

    function onSelectStep(step: CareerPathStep) {
        setSelectedStep(step);
        setCompletionSummaryOpen(false);
        setShowInlineUpsell(false);
    }

    function renderContentItem(stepId: string, item: ContentChainItem) {
        if (selectedStep?.is_description_locked) {
            return (
                <p className="flex items-center gap-2 text-sm text-zinc-400">
                    <Lock className="h-4 w-4" />
                    Conteudo bloqueado para assinantes.
                </p>
            );
        }

        switch (item.content_type) {
            case "VIDEO":
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-200">{item.description}</p>
                        {item.video_url && (
                            <div className="aspect-video overflow-hidden rounded-xl border border-zinc-800">
                                <iframe
                                    src={item.video_url}
                                    title={item.title}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>
                );
            case "QUIZ":
                return renderQuiz(item.id, item.description, item.quiz_schema);
            case "DIAGRAM":
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-200">{item.description}</p>
                        {item.diagram_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.diagram_url} alt={item.title} className="w-full rounded-xl border border-zinc-800 object-cover" />
                        )}
                    </div>
                );
            case "INTERACTIVE_FORM":
                return renderInteractiveForm(item.id, item.description, item.form_schema);
            case "SCENARIO_BUILDER":
                return renderScenarioBuilder(item.id, item.scenario_schema);
            case "RULES_RADIAL":
                return renderRulesRadial(item.id, item.rules_schema);
            case "MATCHING_GAME":
                return renderMatchingGame(item.id, item.matching_schema);
            case "DIALOGUE_SIMULATOR":
                return renderDialogueSimulator(item.id, item.dialogue_schema);
            default:
                return <p className="text-sm text-zinc-200">{item.description}</p>;
        }
    }

    function renderScenarioBuilder(stepId: string, schema: ScenarioBuilderSchema | null) {
        if (!schema) {
            return <p className="text-sm text-zinc-200">Atividade indisponivel.</p>;
        }
        return <ScenarioBuilder schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderRulesRadial(stepId: string, schema: RulesRadialSchema | null) {
        if (!schema) {
            return <p className="text-sm text-zinc-200">Atividade indisponivel.</p>;
        }
        return <RulesRadial schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderMatchingGame(stepId: string, schema: MatchingSchema | null) {
        if (!schema) {
            return <p className="text-sm text-zinc-200">Atividade indisponivel.</p>;
        }
        return <MatchingGame schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderDialogueSimulator(stepId: string, schema: DialogueSchema | null) {
        if (!schema) {
            return <p className="text-sm text-zinc-200">Atividade indisponivel.</p>;
        }
        return <DialogueSimulator schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderQuiz(stepId: string, description: string, schema: QuizSchema | null) {
        if (!schema || schema.questions.length === 0) {
            return <p className="text-sm text-zinc-200">{description}</p>;
        }

        const answers = quizAnswers[stepId] ?? {};
        const completedAll = schema.questions.every((_, index) => typeof answers[index] === "number");
        const score = completedAll
            ? schema.questions.reduce((total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0), 0)
            : null;

        return (
            <div className="space-y-4">
                <p className="text-sm text-zinc-200">{description}</p>
                {schema.questions.map((question, questionIndex) => (
                    <div key={question.prompt} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <p className="text-sm font-semibold text-zinc-100">{question.prompt}</p>
                        <div className="mt-3 grid gap-2">
                            {question.options.map((option, optionIndex) => {
                                const selected = answers[questionIndex] === optionIndex;
                                return (
                                    <button
                                        type="button"
                                        key={option}
                                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [questionIndex]: optionIndex } }))}
                                        className={`rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-teal-400 bg-teal-500/15 text-teal-100" : "border-zinc-700 text-zinc-300"}`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {score !== null && <p className="text-sm text-emerald-300">Resultado: {score}/{schema.questions.length}</p>}
            </div>
        );
    }

    function renderInteractiveForm(stepId: string, description: string, schema: FormSchema | null) {
        if (!schema || schema.fields.length === 0) {
            return <p className="text-sm text-zinc-200">{description}</p>;
        }

        const values = formAnswers[stepId] ?? {};
        return (
            <div className="space-y-4">
                <p className="text-sm text-zinc-200">{description}</p>
                {schema.fields.map((field) => (
                    <label key={field.name} className="block">
                        <span className="mb-2 block text-sm text-zinc-300">{field.label}</span>
                        {field.type === "textarea" ? (
                            <textarea
                                value={values[field.name] ?? ""}
                                onChange={(event) => setFormAnswers((prev) => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [field.name]: event.target.value } }))}
                                placeholder={field.placeholder}
                                className="min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-teal-400"
                            />
                        ) : (
                            <input
                                value={values[field.name] ?? ""}
                                onChange={(event) => setFormAnswers((prev) => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [field.name]: event.target.value } }))}
                                placeholder={field.placeholder}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-teal-400"
                            />
                        )}
                    </label>
                ))}
            </div>
        );
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

    const chainType = currentChainItem?.content_type ?? null;
    const needsResolution = chainType === "SCENARIO_BUILDER" || chainType === "RULES_RADIAL" || chainType === "MATCHING_GAME" || chainType === "DIALOGUE_SIMULATOR";
    const canContinue = !completing && !!selectedStep && selectedStep.status === "UNLOCKED" && (!needsResolution || (currentChainItem ? interactionResolved[currentChainItem.id] : false));

    return (
        <div className="space-y-6">
            {interstitialMessage && (
                <section className="rounded-2xl border border-teal-800/40 bg-teal-950/25 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-teal-100">Preview da trilha personalizada por IA</p>
                            <p className="mt-1 text-sm text-zinc-300">{interstitialMessage}</p>
                        </div>
                        <button type="button" onClick={() => setInterstitialMessage(null)} className="text-sm text-zinc-400 hover:text-zinc-200">
                            Fechar
                        </button>
                    </div>
                </section>
            )}

            <section className="rounded-2xl border border-teal-900/30 bg-zinc-950/60 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Mapa da trilha</p>
                <h1 className="mt-2 text-2xl font-black text-zinc-100">{path.title}</h1>
                <div className="mt-4 flex gap-3 text-xs">
                    <button onClick={() => router.push("/trilha?kind=STANDARD_SOFT_SKILLS")} className={`rounded-full px-3 py-1 ${selectedKind === "STANDARD_SOFT_SKILLS" ? "bg-teal-500 text-zinc-950" : "bg-zinc-900 text-zinc-300"}`}>Soft Skills</button>
                    <button onClick={() => router.push("/trilha?kind=AI_PERSONALIZED")} className={`rounded-full px-3 py-1 ${selectedKind === "AI_PERSONALIZED" ? "bg-teal-500 text-zinc-950" : "bg-zinc-900 text-zinc-300"}`}>IA Personalizada</button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full bg-teal-500 transition-all duration-700 ${recentlyCompletedStepId ? "shadow-[0_0_20px_rgba(20,184,166,0.45)]" : ""}`} style={{ width: `${completionRate}%` }} />
                </div>
                <p className="mt-3 text-sm text-zinc-400">Progresso total: {completionRate}%</p>
            </section>

            <TrailMap
                steps={path.steps}
                activeStepId={selectedStep?.id ?? path.steps.find((step) => step.status === "UNLOCKED")?.id ?? recentlyCompletedStepId ?? null}
                onSelectStep={onSelectStep}
            />

            <ActivityModal
                open={!!selectedStep}
                onClose={closeModal}
                title={selectedStep?.title ?? "Atividade"}
                subtitle={selectedStep ? `Etapa ${selectedStep.order_index + 1}` : undefined}
            >
                {selectedStep && completionSummaryOpen ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/25 p-4">
                            <p className="text-sm font-semibold text-emerald-200">Etapa concluida com sucesso.</p>
                            <p className="mt-1 text-sm text-zinc-300">Voce finalizou todos os estagios desta atividade encadeada.</p>
                        </div>

                        {showInlineUpsell && (
                            <div className="rounded-2xl border border-teal-800/40 bg-teal-950/25 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-teal-100">Quer levar isso para o seu objetivo real?</p>
                                        <p className="mt-1 text-sm text-zinc-300">
                                            Essa atividade foi baseada no seu tipo de carreira. Na trilha personalizada por IA, os cenarios sao ajustados ao seu cargo-alvo.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => router.push("/trilha?kind=AI_PERSONALIZED")}
                                            className="mt-3 rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400"
                                        >
                                            Ver trilha personalizada
                                        </button>
                                    </div>
                                    <button type="button" onClick={() => setShowInlineUpsell(false)} className="text-sm text-zinc-400 hover:text-zinc-200">
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                            >
                                Voltar ao mapa
                            </button>
                        </div>
                    </div>
                ) : selectedStep && currentChainItem ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-500">Atividade encadeada</p>
                                <p className="text-sm font-semibold text-zinc-100">{currentChainItem.title}</p>
                            </div>
                            <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs text-teal-200">
                                Estagio {currentChainIndex + 1} de {selectedChain.length}
                            </span>
                        </div>

                        <div key={currentChainItem.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-300 animate-in fade-in slide-in-from-right-1">
                            {renderContentItem(selectedStep.id, currentChainItem)}
                        </div>

                        {currentChainItem.external_url && !selectedStep.is_description_locked && (
                            <a
                                href={currentChainItem.external_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200"
                            >
                                Abrir material externo <ExternalLink className="h-4 w-4" />
                            </a>
                        )}

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                onClick={handleAdvanceStage}
                                disabled={!canContinue}
                                className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {completing ? "Processando..." : currentChainIndex + 1 < selectedChain.length ? "Proximo estagio" : "Concluir etapa"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-300">Atividade indisponivel.</p>
                )}
            </ActivityModal>
        </div>
    );
}

function buildLegacySingleStage(step: CareerPathStep): ContentChainItem[] {
    if (!step.content_item_id || !step.content_type) {
        return [];
    }

    return [
        {
            id: step.content_item_id,
            title: step.title,
            description: step.description,
            content_type: step.content_type as ApiContentType,
            external_url: step.external_url,
            video_url: step.video_url,
            quiz_schema: step.quiz_schema,
            diagram_url: step.diagram_url,
            form_schema: step.form_schema,
            scenario_schema: step.scenario_schema,
            rules_schema: step.rules_schema,
            matching_schema: step.matching_schema,
            dialogue_schema: step.dialogue_schema,
            follow_up_content_item_id: step.follow_up_content_item_id,
        },
    ];
}
