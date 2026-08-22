"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AiGuide } from "@/components/ai-guide";
import { ConstellationView } from "@/components/constellation-view";
import { extractApiMessage, useBackendApi } from "@/lib/api";
import { useLatestOnboardingContextQuery, useMeQuery, useMyCareerPathsQuery, useTrailTemplatesQuery } from "@/lib/backend-queries";
import type { CareerPath, GoalType, OnboardingContextResponse, TrailTemplate } from "@/lib/types";

const GOAL_TEXT: Record<GoalType, string> = {
    GROW_CURRENT_JOB: "crescer no emprego atual",
    SWITCH_JOB: "trocar de emprego",
    FIND_JOB_ABROAD: "buscar vaga fora do pais",
    MOVE_ABROAD: "morar fora",
};

export default function ConstellacaoPage() {
    const api = useBackendApi();
    const [error, setError] = useState<string | null>(null);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);
    const [showWhyModal, setShowWhyModal] = useState(false);

    const meQuery = useMeQuery();
    const pathsQuery = useMyCareerPathsQuery();
    const templatesQuery = useTrailTemplatesQuery();
    const contextQuery = useLatestOnboardingContextQuery();

    const loading = meQuery.isLoading || pathsQuery.isLoading || templatesQuery.isLoading || contextQuery.isLoading;
    const paths = pathsQuery.data ?? [];
    const templates = templatesQuery.data ?? [];
    const hasSubscription = meQuery.data?.has_active_subscription ?? false;
    const onboardingContext: OnboardingContextResponse | null = contextQuery.data ?? null;

    const categories = useMemo(() => {
        const all = Array.from(new Set(templates.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
        return ["all", ...all];
    }, [templates]);

    const visibleTemplates = useMemo(() => {
        const base = templates.filter((item) => !item.already_added && !item.is_starter);
        if (categoryFilter === "all") {
            return base;
        }
        return base.filter((item) => item.category === categoryFilter);
    }, [categoryFilter, templates]);

    async function handleAddTemplate(templateId: string) {
        try {
            setAddingTemplateId(templateId);
            await api.addTrailTemplate(templateId);
            await Promise.all([pathsQuery.mutate(), templatesQuery.mutate()]);
            setCatalogOpen(false);
        } catch (e) {
            setError(extractApiMessage(e, "Não foi possível adicionar a trilha."));
        } finally {
            setAddingTemplateId(null);
        }
    }

    const queryError = meQuery.error ?? pathsQuery.error ?? templatesQuery.error ?? contextQuery.error;
    const resolvedError = error ?? (queryError ? extractApiMessage(queryError, "Não foi possível carregar as trilhas.") : null);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-9rem)] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }

    if (resolvedError) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{resolvedError}</p>;
    }

    return (
        <div className="space-y-3">
            <AiGuide
                tipId="constelacao-first"
                trigger={!loading && paths.length > 0}
                message="Cada planeta e uma trilha. Clique para entrar e seguir seu proximo passo."
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-foreground">Minhas Trilhas</h1>
                    <p className="text-sm text-muted">Clique em uma trilha para abrir o mapa.</p>
                </div>
                <Link href="/dashboard" className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                    Ver resumo →
                </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/45 px-3 py-2 text-xs">
                <span className="rounded-full border border-accent-blue/35 bg-accent-blue/10 px-2.5 py-1 font-semibold text-accent-blue">Base curada</span>
                <span className="rounded-full border border-accent-purple/35 bg-accent-purple/10 px-2.5 py-1 font-semibold text-accent-purple">Personalizado por IA</span>
                <button
                    type="button"
                    className="ml-auto text-accent-blue hover:text-accent-hover"
                    onClick={() => setShowWhyModal(true)}
                >
                    Por que estou vendo essas trilhas?
                </button>
            </div>
            <div className="h-[calc(100vh-11rem)]">
                <ConstellationView paths={paths} hasSubscription={hasSubscription} onAddTrail={() => setCatalogOpen(true)} />
            </div>

            {showWhyModal && (
                <div className="fixed inset-0 z-50 bg-black/45 p-4" onClick={() => setShowWhyModal(false)}>
                    <div
                        className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-border bg-background p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-muted">Transparencia</p>
                                <h2 className="mt-1 text-lg font-black text-foreground">Como escolhemos suas trilhas</h2>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                                onClick={() => setShowWhyModal(false)}
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-muted">
                            <p>
                                As trilhas de <span className="font-semibold text-accent-blue">Base curada</span> vem de modelos validados para acelerar seu inicio com passos praticos.
                            </p>
                            <p>
                                As trilhas <span className="font-semibold text-accent-purple">Personalizado por IA</span> combinam seu objetivo e contexto para priorizar etapas mais aderentes ao seu momento.
                            </p>
                            {onboardingContext && (
                                <p className="rounded-xl border border-border bg-surface/55 p-3 text-foreground">
                                    Hoje, seu perfil base considera quem atua como <span className="font-semibold">{onboardingContext.current_job}</span>, com foco em <span className="font-semibold">{GOAL_TEXT[onboardingContext.goal]}</span> dentro de <span className="font-semibold">{onboardingContext.career_type}</span>.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {catalogOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={() => setCatalogOpen(false)}>
                    <div
                        className="mx-auto mt-14 w-full max-w-3xl rounded-2xl border border-border bg-background p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-foreground">Catálogo de Trilhas</h2>
                                <p className="text-sm text-muted">Escolha uma trilha temática para adicionar na constelação.</p>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                                onClick={() => setCatalogOpen(false)}
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    className={`rounded-full border px-3 py-1 text-xs ${categoryFilter === category ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted"}`}
                                    onClick={() => setCategoryFilter(category)}
                                >
                                    {category === "all" ? "Todas" : category}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {visibleTemplates.map((template) => (
                                <article key={template.id} className="rounded-xl border border-border bg-surface/35 p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-muted">{template.category}</p>
                                    <h3 className="mt-1 text-sm font-bold text-foreground">{template.title}</h3>
                                    <p className="mt-2 text-xs text-muted">{template.description}</p>
                                    <button
                                        type="button"
                                        className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() => handleAddTemplate(template.id)}
                                        disabled={addingTemplateId === template.id}
                                    >
                                        {addingTemplateId === template.id ? "Adicionando..." : "Adicionar"}
                                    </button>
                                </article>
                            ))}
                        </div>

                        {visibleTemplates.length === 0 && (
                            <p className="rounded-lg border border-border bg-surface/25 p-3 text-sm text-muted">
                                Nenhuma trilha disponível nessa categoria.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
