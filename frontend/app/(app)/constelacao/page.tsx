"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ConstellationView } from "@/components/constellation-view";
import { extractApiMessage, isApiNotFound, useBackendApi } from "@/lib/api";
import type { CareerPath, TrailTemplate } from "@/lib/types";

export default function ConstellacaoPage() {
    const api = useBackendApi();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paths, setPaths] = useState<CareerPath[]>([]);
    const [templates, setTemplates] = useState<TrailTemplate[]>([]);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);

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

    async function loadPaths() {
        const careerPaths = await api.getMyCareerPaths().catch((e: unknown) => {
            if (isApiNotFound(e)) return [] as CareerPath[];
            throw e;
        });
        setPaths(careerPaths);
    }

    async function loadTemplates() {
        const list = await api.listTrailTemplates();
        setTemplates(list);
    }

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [me, careerPaths, trailTemplates] = await Promise.all([
                    api.getMe(),
                    api.getMyCareerPaths().catch((e: unknown) => {
                        if (isApiNotFound(e)) return [] as CareerPath[];
                        throw e;
                    }),
                    api.listTrailTemplates(),
                ]);
                if (!cancelled) {
                    setHasSubscription(me.has_active_subscription);
                    setPaths(careerPaths);
                    setTemplates(trailTemplates);
                }
            } catch (e) {
                if (!cancelled) setError(extractApiMessage(e, "Não foi possível carregar as trilhas."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, [api]);

    async function handleAddTemplate(templateId: string) {
        try {
            setAddingTemplateId(templateId);
            await api.addTrailTemplate(templateId);
            await Promise.all([loadPaths(), loadTemplates()]);
            setCatalogOpen(false);
        } catch (e) {
            setError(extractApiMessage(e, "Não foi possível adicionar a trilha."));
        } finally {
            setAddingTemplateId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-9rem)] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-foreground">Minhas Trilhas</h1>
                    <p className="text-sm text-muted">Clique em uma trilha para abrir o mapa.</p>
                </div>
                <Link href="/dashboard" className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                    Ver resumo →
                </Link>
            </div>
            <div className="h-[calc(100vh-11rem)]">
                <ConstellationView paths={paths} hasSubscription={hasSubscription} onAddTrail={() => setCatalogOpen(true)} />
            </div>

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
