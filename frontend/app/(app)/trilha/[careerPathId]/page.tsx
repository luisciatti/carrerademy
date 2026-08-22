"use client";

import { ExternalLink, Lock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ActivityModal } from "@/components/activity-modal";
import { ActiveStepCard } from "@/components/active-step-card";
import { AiGuide } from "@/components/ai-guide";
import { DialogueSimulator } from "@/components/dialogue-simulator";
import { MatchingGame } from "@/components/matching-game";
import { RewardCard } from "@/components/reward-card";
import { RulesRadial } from "@/components/rules-radial";
import { ScenarioBuilder } from "@/components/scenario-builder";
import { TipCard } from "@/components/tip-card";
import { TrailHeaderCard } from "@/components/trail-header-card";
import { TrailMap } from "@/components/trail-map";
import { extractApiMessage, useBackendApi } from "@/lib/api";
import { useMeQuery } from "@/lib/backend-queries";
import type {
    ApiContentType,
    CareerPath,
    CareerPathStep,
    ContentChainItem,
    DialogueSchema,
    FormSchema,
    MatchingSchema,
    PaywallTeaserResponse,
    QuizSchema,
    RulesRadialSchema,
    ScenarioBuilderSchema,
} from "@/lib/types";

const INTERSTITIAL_KEY = "careerademy.softskills.completion-count";

export default function TrailPage() {
    const api = useBackendApi();
    const meQuery = useMeQuery();
    const router = useRouter();
    const params = useParams<{ careerPathId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paths, setPaths] = useState<CareerPath[]>([]);
    const [selectedStep, setSelectedStep] = useState<CareerPathStep | null>(null);
    // rewardStep holds the step whose reward card is being shown; selectedStep holds the one whose activity is open
    const [rewardStep, setRewardStep] = useState<CareerPathStep | null>(null);
    const [completing, setCompleting] = useState(false);
    const [interactionResolved, setInteractionResolved] = useState<Record<string, boolean>>({});
    const [recentlyCompletedStepId, setRecentlyCompletedStepId] = useState<string | null>(null);
    const [completionSummaryOpen, setCompletionSummaryOpen] = useState(false);
    const [showInlineUpsell, setShowInlineUpsell] = useState(false);
    const [activeContentOverrideByStep, setActiveContentOverrideByStep] = useState<Record<string, string>>({});
    const [interstitialMessage, setInterstitialMessage] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<number, number>>>({});
    const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, string>>>({});
    // note content keyed by step ID, loaded lazily when step is opened
    const [stepNotes, setStepNotes] = useState<Record<string, string>>({});;
    const [completionGuideTrigger, setCompletionGuideTrigger] = useState(false);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [paywallTeaser, setPaywallTeaser] = useState<PaywallTeaserResponse | null>(null);

    const selectedCareerPathId = params.careerPathId;

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const [result, teaser] = await Promise.all([
                    api.getCareerPathById(selectedCareerPathId),
                    api.getPaywallTeaser().catch(() => null),
                ]);
                if (!cancelled) {
                    setPaths([result]);
                    setPaywallTeaser(teaser);
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
    }, [api, selectedCareerPathId]);

    useEffect(() => {
        if (meQuery.data) {
            setHasSubscription(meQuery.data.has_active_subscription);
        }
    }, [meQuery.data]);

    const path = useMemo(() => {
        return paths[0] ?? null;
    }, [paths]);

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
            const updatedPath = await api.getCareerPathById(selectedCareerPathId);
            setPaths([updatedPath]);
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
            setCompletionGuideTrigger(true);
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
        setRewardStep(null);
        setCompletionSummaryOpen(false);
        setShowInlineUpsell(false);
    }

    function onSelectStep(step: CareerPathStep) {
        // Show reward card first; activity opens only after the user accepts
        setRewardStep(step);
        setSelectedStep(null);
        setCompletionSummaryOpen(false);
        setShowInlineUpsell(false);
    }

    function onAcceptReward() {
        if (!rewardStep) return;
        const step = rewardStep;
        setSelectedStep(step);
        setRewardStep(null);
        // Lazily load the note for this step if not yet cached
        if (!(step.id in stepNotes)) {
            api.getNoteByStep(step.id)
                .then((note) => {
                    setStepNotes((prev) => ({ ...prev, [step.id]: note?.content ?? "" }));
                })
                .catch(() => {
                    setStepNotes((prev) => ({ ...prev, [step.id]: "" }));
                });
        }
    }

    function renderContentItem(stepId: string, item: ContentChainItem) {
        if (selectedStep?.is_description_locked) {
            return (
                <p className="flex items-center gap-2 text-sm text-muted">
                    <Lock className="h-4 w-4" />
                    Conteudo bloqueado para assinantes.
                </p>
            );
        }

        switch (item.content_type) {
            case "VIDEO":
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-foreground">{item.description}</p>
                        {item.video_url && (
                            <div className="aspect-video overflow-hidden rounded-xl border border-border">
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
                        <p className="text-sm text-foreground">{item.description}</p>
                        {item.diagram_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.diagram_url} alt={item.title} className="w-full rounded-xl border border-border object-cover" />
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
                return <p className="text-sm text-foreground">{item.description}</p>;
        }
    }

    function renderScenarioBuilder(stepId: string, schema: ScenarioBuilderSchema | null) {
        if (!schema) {
            return <p className="text-sm text-foreground">Atividade indisponivel.</p>;
        }
        return <ScenarioBuilder schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderRulesRadial(stepId: string, schema: RulesRadialSchema | null) {
        if (!schema) {
            return <p className="text-sm text-foreground">Atividade indisponivel.</p>;
        }
        return <RulesRadial schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderMatchingGame(stepId: string, schema: MatchingSchema | null) {
        if (!schema) {
            return <p className="text-sm text-foreground">Atividade indisponivel.</p>;
        }
        return <MatchingGame schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderDialogueSimulator(stepId: string, schema: DialogueSchema | null) {
        if (!schema) {
            return <p className="text-sm text-foreground">Atividade indisponivel.</p>;
        }
        return <DialogueSimulator schema={schema} onResolved={(resolved) => setInteractionResolved((prev) => ({ ...prev, [stepId]: resolved }))} />;
    }

    function renderQuiz(stepId: string, description: string, schema: QuizSchema | null) {
        if (!schema || schema.questions.length === 0) {
            return <p className="text-sm text-foreground">{description}</p>;
        }

        const answers = quizAnswers[stepId] ?? {};
        const completedAll = schema.questions.every((_, index) => typeof answers[index] === "number");
        const score = completedAll
            ? schema.questions.reduce((total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0), 0)
            : null;

        return (
            <div className="space-y-4">
                <p className="text-sm text-foreground">{description}</p>
                {schema.questions.map((question, questionIndex) => (
                    <div key={question.prompt} className="rounded-xl border border-border bg-surface p-4">
                        <p className="text-sm font-semibold text-foreground">{question.prompt}</p>
                        <div className="mt-3 grid gap-2">
                            {question.options.map((option, optionIndex) => {
                                const selected = answers[questionIndex] === optionIndex;
                                return (
                                    <button
                                        type="button"
                                        key={option}
                                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [questionIndex]: optionIndex } }))}
                                        className={`rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-accent-blue/45 bg-accent-blue/12 text-accent-blue" : "border-border text-muted"}`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {score !== null && <p className="text-sm text-accent-mint">Resultado: {score}/{schema.questions.length}</p>}
            </div>
        );
    }

    function renderInteractiveForm(stepId: string, description: string, schema: FormSchema | null) {
        if (!schema || schema.fields.length === 0) {
            return <p className="text-sm text-foreground">{description}</p>;
        }

        const values = formAnswers[stepId] ?? {};
        return (
            <div className="space-y-4">
                <p className="text-sm text-foreground">{description}</p>
                {schema.fields.map((field) => (
                    <label key={field.name} className="block">
                        <span className="mb-2 block text-sm text-muted">{field.label}</span>
                        {field.type === "textarea" ? (
                            <textarea
                                value={values[field.name] ?? ""}
                                onChange={(event) => setFormAnswers((prev) => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [field.name]: event.target.value } }))}
                                placeholder={field.placeholder}
                                className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
                            />
                        ) : (
                            <input
                                value={values[field.name] ?? ""}
                                onChange={(event) => setFormAnswers((prev) => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [field.name]: event.target.value } }))}
                                placeholder={field.placeholder}
                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
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
                <div className="h-20 animate-pulse rounded-2xl bg-surface" />
                <div className="h-80 animate-pulse rounded-2xl bg-surface" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    if (!path) {
        return <p className="text-sm text-muted">Nenhuma trilha encontrada.</p>;
    }

    const chainType = currentChainItem?.content_type ?? null;
    const needsResolution = chainType === "SCENARIO_BUILDER" || chainType === "RULES_RADIAL" || chainType === "MATCHING_GAME" || chainType === "DIALOGUE_SIMULATOR";
    const canContinue = !completing && !!selectedStep && selectedStep.status === "UNLOCKED" && (!needsResolution || (currentChainItem ? interactionResolved[currentChainItem.id] : false));
    const hasPremiumLocked = path.steps.some((step) => step.status === "LOCKED" && step.is_description_locked);
    const showCompactTeaser = !hasSubscription && !!paywallTeaser?.salary_benchmark;

    const activeStep = path.steps.find((s) => s.status === "UNLOCKED") ?? null;

    return (
        <div className="space-y-5">
            <AiGuide
                tipId="first-step-completed"
                trigger={completionGuideTrigger}
                message="Boa. Essa foi sua primeira etapa concluida. Continue no mesmo ritmo para manter sua evolucao."
            />
            <AiGuide
                tipId="premium-locked-first"
                trigger={hasPremiumLocked}
                message="Esse conteudo faz parte da trilha personalizada por IA. Continue a trilha atual e explore quando quiser avancar para o premium."
                position="bottom-left"
            />

            <div>
                <Link href="/constelacao" className="text-sm text-muted hover:text-foreground">
                    ← Voltar pra constelacao
                </Link>
            </div>

            {showCompactTeaser && paywallTeaser?.salary_benchmark && (
                <section className="rounded-2xl border border-accent-blue/35 bg-accent-blue/8 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-blue">
                                <Sparkles className="h-3.5 w-3.5" />
                                Teaser salarial
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">Faixa de mercado para {paywallTeaser.salary_benchmark.role_title}</p>
                            <p className="mt-1 text-lg font-black text-foreground">
                                <span>R$ {paywallTeaser.salary_benchmark.visible_salary_min.toLocaleString("pt-BR")} - </span>
                                <span className="relative inline-flex items-center">
                                    <span className="select-none blur-[7px]">R$ {paywallTeaser.salary_benchmark.visible_salary_max_hint}/ano</span>
                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-background/35 to-background/80" />
                                </span>
                            </p>
                            <p className="mt-1 text-xs text-muted">Estimativa baseada em dados publicos de {paywallTeaser.salary_benchmark.source}.</p>
                        </div>
                        <Link href="/paywall" className="rounded-full border border-accent-blue/40 bg-surface px-3 py-1.5 text-xs font-semibold text-accent-blue hover:border-accent-blue">
                            Ver faixa completa
                        </Link>
                    </div>
                </section>
            )}

            {interstitialMessage && (
                <section className="rounded-2xl border border-accent-blue/40 bg-accent-blue/10 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Preview da trilha personalizada por IA</p>
                            <p className="mt-1 text-sm text-muted">{interstitialMessage}</p>
                        </div>
                        <button type="button" onClick={() => setInterstitialMessage(null)} className="text-sm text-muted hover:text-foreground">
                            Fechar
                        </button>
                    </div>
                </section>
            )}

            <TrailHeaderCard
                path={path}
                completionRate={completionRate}
                selectedKind={path.kind}
                onKindChange={() => {
                    router.push("/constelacao");
                }}
                recentlyCompleted={!!recentlyCompletedStepId}
            />

            {path.kind === "STANDARD_SOFT_SKILLS" && (
                <TipCard pathTitle={path.title} />
            )}

            {activeStep && (
                <ActiveStepCard
                    step={activeStep}
                    pathKind={path.kind}
                    onStart={onSelectStep}
                />
            )}

            <TrailMap
                steps={path.steps}
                activeStepId={selectedStep?.id ?? activeStep?.id ?? recentlyCompletedStepId ?? null}
                onSelectStep={onSelectStep}
            />

            {/* Reward card: shown before the activity opens */}
            <ActivityModal
                open={!!rewardStep && !selectedStep}
                onClose={() => setRewardStep(null)}
                title=""
                subtitle={rewardStep ? `Etapa ${rewardStep.order_index + 1}` : undefined}
            >
                {rewardStep && (
                    <RewardCard
                        step={rewardStep}
                        onAccept={onAcceptReward}
                        onClose={() => setRewardStep(null)}
                    />
                )}
            </ActivityModal>

            <ActivityModal
                open={!!selectedStep}
                onClose={closeModal}
                title={selectedStep?.title ?? "Atividade"}
                subtitle={selectedStep ? `Etapa ${selectedStep.order_index + 1}` : undefined}
                stepId={selectedStep?.id}
                noteContent={selectedStep ? (stepNotes[selectedStep.id] ?? "") : ""}
                onNoteSave={selectedStep ? async (content) => {
                    setStepNotes((prev) => ({ ...prev, [selectedStep.id]: content }));
                    await api.upsertNoteByStep(selectedStep.id, content);
                } : undefined}
            >
                {selectedStep && completionSummaryOpen ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-accent-mint/40 bg-accent-mint/12 p-4">
                            <p className="text-sm font-semibold text-accent-mint">Etapa concluida com sucesso.</p>
                            <p className="mt-1 text-sm text-muted">Voce finalizou todos os estagios desta atividade encadeada.</p>
                        </div>

                        {showInlineUpsell && (
                            <div className="rounded-2xl border border-accent-purple/35 bg-accent-purple/12 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Quer levar isso para o seu objetivo real?</p>
                                        <p className="mt-1 text-sm text-muted">
                                            Essa atividade foi baseada no seu tipo de carreira. Na trilha personalizada por IA, os cenarios sao ajustados ao seu cargo-alvo.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => router.push("/constelacao")}
                                            className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                                        >
                                            Ver constelacao
                                        </button>
                                    </div>
                                    <button type="button" onClick={() => setShowInlineUpsell(false)} className="text-sm text-muted hover:text-foreground">
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-border"
                            >
                                Voltar ao mapa
                            </button>
                        </div>
                    </div>
                ) : selectedStep && currentChainItem ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">Atividade encadeada</p>
                                <p className="text-sm font-semibold text-foreground">{currentChainItem.title}</p>
                            </div>
                            <span className="rounded-full bg-accent-blue/15 px-3 py-1 text-xs text-accent-blue">
                                Estagio {currentChainIndex + 1} de {selectedChain.length}
                            </span>
                        </div>

                        <div key={currentChainItem.id} className="rounded-xl border border-border bg-surface p-4 transition-all duration-300 animate-in fade-in slide-in-from-right-1">
                            {renderContentItem(selectedStep.id, currentChainItem)}
                        </div>

                        {currentChainItem.external_url && !selectedStep.is_description_locked && (
                            <a
                                href={currentChainItem.external_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-accent-blue hover:text-accent-hover"
                            >
                                Abrir material externo <ExternalLink className="h-4 w-4" />
                            </a>
                        )}

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                onClick={handleAdvanceStage}
                                disabled={!canContinue}
                                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {completing ? "Processando..." : currentChainIndex + 1 < selectedChain.length ? "Proximo estagio" : "Concluir etapa"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted">Atividade indisponivel.</p>
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
            reward_description: step.reward_description,
        },
    ];
}
