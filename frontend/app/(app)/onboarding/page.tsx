"use client";

import { Copy, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { extractApiMessage, useBackendApi } from "@/lib/api";
import type { CareerType, GoalType, OnboardingPayload } from "@/lib/types";

const CAREER_TYPE_OPTIONS: Array<{ value: CareerType; label: string }> = [
    { value: "TECH", label: "Tech" },
    { value: "DESIGN", label: "Design" },
    { value: "MARKETING", label: "Marketing" },
    { value: "SALES", label: "Vendas" },
    { value: "FINANCE", label: "Financas" },
    { value: "OPERATIONS", label: "Operacoes" },
    { value: "OTHER", label: "Outro" },
];

const GOAL_OPTIONS: Array<{ value: GoalType; label: string }> = [
    { value: "GROW_CURRENT_JOB", label: "Crescer no emprego atual" },
    { value: "SWITCH_JOB", label: "Trocar de emprego" },
    { value: "FIND_JOB_ABROAD", label: "Vaga fora do pais" },
    { value: "MOVE_ABROAD", label: "Morar fora" },
];

const WEEKLY_TIME_OPTIONS = [3, 5, 7, 10, 14, 20];

const GOAL_ACCENT: Record<GoalType, string> = {
    GROW_CURRENT_JOB: "border-accent-blue/40 bg-accent-blue/10 text-accent-blue",
    SWITCH_JOB: "border-accent-coral/40 bg-accent-coral/10 text-accent-coral",
    FIND_JOB_ABROAD: "border-accent-mint/40 bg-accent-mint/10 text-accent-mint",
    MOVE_ABROAD: "border-accent-purple/40 bg-accent-purple/10 text-accent-purple",
};

export default function OnboardingPage() {
    const api = useBackendApi();
    const router = useRouter();

    const [form, setForm] = useState<OnboardingPayload>({
        current_job: "",
        dream_job: null,
        career_type: "TECH",
        goal: "GROW_CURRENT_JOB",
        experience_level: "Intermediario",
        weekly_time_availability: 5,
    });
    const [onboardingId, setOnboardingId] = useState<string | null>(null);
    const [statement, setStatement] = useState<string>("");
    const [statementGeneratedAt, setStatementGeneratedAt] = useState<string | null>(null);
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [exploring, setExploring] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draftNotice, setDraftNotice] = useState<string | null>(null);
    const [draftRetryTick, setDraftRetryTick] = useState(0);

    const [editingCurrentJob, setEditingCurrentJob] = useState(false);
    const [editingDreamJob, setEditingDreamJob] = useState(false);
    const [currentJobInput, setCurrentJobInput] = useState("");
    const [dreamJobInput, setDreamJobInput] = useState("");

    const lastSentSignatureRef = useRef<string>("");

    const canGenerate = form.current_job.trim().length >= 2 && Boolean(form.goal);

    useEffect(() => {
        setCurrentJobInput(form.current_job);
    }, [form.current_job]);

    useEffect(() => {
        setDreamJobInput(form.dream_job ?? "");
    }, [form.dream_job]);

    const payload = useMemo<OnboardingPayload>(() => ({
        ...form,
        current_job: form.current_job.trim(),
        dream_job: form.dream_job?.trim() ? form.dream_job.trim() : null,
    }), [form]);

    useEffect(() => {
        if (!canGenerate) {
            setDraftNotice(null);
            return;
        }

        const signature = JSON.stringify(payload);
        if (signature === lastSentSignatureRef.current) {
            return;
        }

        const timer = window.setTimeout(async () => {
            setLoadingDraft(true);
            setDraftNotice(null);
            try {
                const result = await api.upsertOnboardingDraft(payload, onboardingId);
                lastSentSignatureRef.current = signature;
                setOnboardingId(result.onboarding_response_id);
                setStatement(result.identity_statement);
                setStatementGeneratedAt(result.identity_statement_generated_at);
                setDraftNotice(null);
            } catch {
                setDraftNotice("Nao foi possivel atualizar agora, tentando de novo...");
                window.setTimeout(() => {
                    setDraftRetryTick((value) => value + 1);
                }, 3500);
            } finally {
                setLoadingDraft(false);
            }
        }, 2200);

        return () => window.clearTimeout(timer);
    }, [api, canGenerate, onboardingId, payload, draftRetryTick]);

    async function regenerateStatement() {
        if (!onboardingId || regenerating) return;
        setRegenerating(true);
        setDraftNotice(null);
        try {
            const result = await api.regenerateIdentityStatement(onboardingId);
            setStatement(result.identity_statement);
            setStatementGeneratedAt(result.identity_statement_generated_at);
            lastSentSignatureRef.current = JSON.stringify(payload);
        } catch {
            setDraftNotice("Nao foi possivel gerar uma nova versao agora.");
        } finally {
            setRegenerating(false);
        }
    }

    async function exploreTrails() {
        if (exploring) return;
        if (!canGenerate) {
            setError("Preencha ao menos sua situacao atual para gerar a identidade e explorar trilhas.");
            return;
        }

        setExploring(true);
        setError(null);
        try {
            let stableOnboardingId = onboardingId;
            if (!stableOnboardingId) {
                const draft = await api.upsertOnboardingDraft(payload);
                stableOnboardingId = draft.onboarding_response_id;
                setOnboardingId(stableOnboardingId);
                setStatement(draft.identity_statement);
                setStatementGeneratedAt(draft.identity_statement_generated_at);
                lastSentSignatureRef.current = JSON.stringify(payload);
            }

            await api.exploreFromOnboarding(stableOnboardingId);
            router.push("/constelacao");
        } catch (e) {
            setError(extractApiMessage(e, "Nao foi possivel iniciar suas trilhas agora."));
        } finally {
            setExploring(false);
        }
    }

    async function copyStatement() {
        if (!statement) return;
        await navigator.clipboard.writeText(statement);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    }

    function applyCurrentJob() {
        const value = currentJobInput.trim();
        setForm((prev) => ({ ...prev, current_job: value }));
        setEditingCurrentJob(false);
    }

    function applyDreamJob() {
        const value = dreamJobInput.trim();
        setForm((prev) => ({ ...prev, dream_job: value || null }));
        setEditingDreamJob(false);
    }

    return (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_1.4fr]">
            <section className="app-card p-5 md:p-6">
                <p className="text-xs uppercase tracking-widest text-muted">Seu contexto</p>
                <h1 className="mt-2 text-2xl font-black text-foreground">Monte sua base de carreira</h1>
                <p className="mt-1 text-sm text-muted">Edite os chips. A identidade da direita atualiza automaticamente.</p>

                <div className="mt-6 space-y-5">
                    <Category title="🏢 Situacao atual">
                        {form.current_job ? (
                            <EditableChip label={form.current_job} tone="blue" onRemove={() => setForm((prev) => ({ ...prev, current_job: "" }))} />
                        ) : (
                            <AddButton label="Adicionar cargo atual" onClick={() => setEditingCurrentJob(true)} />
                        )}
                        {!editingCurrentJob && (
                            <InlineAction label={form.current_job ? "+ Trocar" : "+ Adicionar"} onClick={() => setEditingCurrentJob(true)} />
                        )}
                        {editingCurrentJob && (
                            <InlineEditor
                                value={currentJobInput}
                                onChange={setCurrentJobInput}
                                onSave={applyCurrentJob}
                                onCancel={() => setEditingCurrentJob(false)}
                                placeholder="Ex: Analista de suporte"
                            />
                        )}
                    </Category>

                    <Category title="🎯 Objetivo">
                        <div className="flex flex-wrap gap-2">
                            {GOAL_OPTIONS.map((option) => {
                                const active = form.goal === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, goal: option.value }))}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? GOAL_ACCENT[option.value] : "border-border bg-surface text-muted hover:border-accent-blue/35"}`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Category>

                    <Category title="🧭 Tipo de carreira">
                        <div className="flex flex-wrap gap-2">
                            {CAREER_TYPE_OPTIONS.map((option) => {
                                const active = form.career_type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, career_type: option.value }))}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-accent-purple/40 bg-accent-purple/10 text-accent-purple" : "border-border bg-surface text-muted hover:border-accent-purple/35"}`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Category>

                    <Category title="⏱️ Disponibilidade">
                        <div className="flex flex-wrap gap-2">
                            {WEEKLY_TIME_OPTIONS.map((hours) => {
                                const active = form.weekly_time_availability === hours;
                                return (
                                    <button
                                        key={hours}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, weekly_time_availability: hours }))}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-accent-mint/40 bg-accent-mint/10 text-accent-mint" : "border-border bg-surface text-muted hover:border-accent-mint/35"}`}
                                    >
                                        {hours}h/semana
                                    </button>
                                );
                            })}
                        </div>
                    </Category>

                    <Category title="✨ Emprego dos sonhos (opcional)">
                        {form.dream_job ? (
                            <EditableChip label={form.dream_job} tone="purple" onRemove={() => setForm((prev) => ({ ...prev, dream_job: null }))} />
                        ) : (
                            <AddButton label="+ Adicionar" onClick={() => setEditingDreamJob(true)} />
                        )}
                        {!editingDreamJob && (
                            <InlineAction label={form.dream_job ? "+ Trocar" : "+ Adicionar"} onClick={() => setEditingDreamJob(true)} />
                        )}
                        {editingDreamJob && (
                            <InlineEditor
                                value={dreamJobInput}
                                onChange={setDreamJobInput}
                                onSave={applyDreamJob}
                                onCancel={() => setEditingDreamJob(false)}
                                placeholder="Ex: Cloud Engineer"
                            />
                        )}
                    </Category>
                </div>
            </section>

            <section className="app-card p-5 md:p-7">
                <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-accent-blue/35 bg-accent-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-blue">
                        <Sparkles className="h-3.5 w-3.5" />
                        {statementGeneratedAt ? "Identidade ativa" : "Rascunho inicial"}
                    </div>
                    <div className="text-xs text-muted">{loadingDraft ? "Atualizando..." : "Atualizacao automatica"}</div>
                </div>

                <h2 className="mt-4 text-3xl font-black text-foreground">Sua Identidade de Carreira</h2>

                <div className="mt-4 min-h-[260px] rounded-3xl border border-white/40 bg-white/80 p-6 shadow-[0_10px_30px_rgba(75,123,236,0.08)] dark:border-border/80 dark:bg-surface">
                    {statement ? (
                        <p className="text-lg leading-8 text-foreground">{statement}</p>
                    ) : (
                        <p className="text-sm text-muted">
                            Preencha ao menos sua situacao atual e objetivo para gerar seu primeiro rascunho de identidade.
                        </p>
                    )}
                </div>

                {draftNotice && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-300">
                        <span>{draftNotice}</span>
                        <button
                            type="button"
                            className="rounded border border-amber-300/40 px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-300/10"
                            onClick={() => setDraftRetryTick((value) => value + 1)}
                        >
                            Tentar agora
                        </button>
                    </div>
                )}

                {error && (
                    <p className="mt-4 rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={regenerateStatement}
                        disabled={!onboardingId || regenerating}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-accent-blue/35 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                        {regenerating ? "Gerando..." : "Gerar de novo"}
                    </button>
                    <button
                        type="button"
                        onClick={copyStatement}
                        disabled={!statement}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-accent-mint/35 disabled:opacity-60"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? "Copiado" : "Copiar"}
                    </button>
                    <button
                        type="button"
                        onClick={exploreTrails}
                        disabled={exploring}
                        className="ml-auto inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60"
                    >
                        {exploring ? "Preparando trilhas..." : "Explorar trilhas"}
                    </button>
                </div>
            </section>
        </div>
    );
}

function Category({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
            {children}
        </div>
    );
}

function EditableChip({ label, onRemove, tone }: { label: string; onRemove: () => void; tone: "blue" | "purple" }) {
    const toneClass = tone === "blue"
        ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
        : "border-accent-purple/40 bg-accent-purple/10 text-accent-purple";

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
            {label}
            <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-black/5" aria-label="Remover">
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-accent-blue/35 hover:text-foreground"
        >
            <Plus className="h-3 w-3" />
            {label}
        </button>
    );
}

function InlineAction({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="block text-xs font-semibold text-accent-blue hover:text-accent-hover"
        >
            {label}
        </button>
    );
}

function InlineEditor({
    value,
    onChange,
    onSave,
    onCancel,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    placeholder: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="min-w-[230px] flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent-blue/40"
            />
            <button type="button" onClick={onSave} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover">
                Salvar
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted hover:text-foreground">
                Cancelar
            </button>
        </div>
    );
}