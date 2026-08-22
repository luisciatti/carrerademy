"use client";

import { Copy, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { extractApiMessage, useBackendApi } from "@/lib/api";
import type { IdentityStatementResponse } from "@/lib/types";

export default function IdentityStatementPage() {
    const api = useBackendApi();
    const router = useRouter();
    const searchParams = useSearchParams();
    const onboardingId = searchParams.get("onboarding_id");
    const aiPathId = searchParams.get("ai_path_id");
    const standardPathId = searchParams.get("standard_path_id");

    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statement, setStatement] = useState<IdentityStatementResponse | null>(null);

    useEffect(() => {
        if (!onboardingId) {
            router.replace("/dashboard");
            return;
        }

        const stableOnboardingId = onboardingId;

        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const result = await api.getIdentityStatement(stableOnboardingId);
                if (!cancelled) {
                    setStatement(result);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(extractApiMessage(e, "Nao foi possivel carregar sua identidade de carreira."));
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
    }, [api, onboardingId, router]);

    async function handleRegenerate() {
        if (!onboardingId || regenerating) return;
        setRegenerating(true);
        setError(null);
        try {
            const result = await api.regenerateIdentityStatement(onboardingId);
            setStatement(result);
        } catch (e) {
            setError(extractApiMessage(e, "Nao foi possivel gerar uma nova versao agora."));
        } finally {
            setRegenerating(false);
        }
    }

    async function handleCopy() {
        if (!statement?.identity_statement) return;
        await navigator.clipboard.writeText(statement.identity_statement);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    }

    const continueHref = "/dashboard";
    const generatingHref = aiPathId ? `/trilha/gerando?career_path_id=${aiPathId}` : "/dashboard";
    const standardHref = standardPathId ? `/trilha/${standardPathId}` : "/dashboard";

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <section className="app-card overflow-hidden p-8">
                <div className="pointer-events-none absolute" />
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[color:var(--accent-purple)]/14 text-[color:var(--accent-purple)]">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted">Sua identidade de carreira</p>
                        <h1 className="mt-1 text-3xl font-black text-foreground">Uma primeira leitura sobre quem voce esta se tornando</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted">
                            Antes de mergulhar nas atividades, aqui vai uma sintese curta do que entendemos sobre seu momento profissional.
                        </p>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl bg-gradient-to-br from-[color:var(--accent-purple)]/14 via-white to-[color:var(--accent-coral)]/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-[color:var(--accent-purple)]/20 dark:via-surface dark:to-[color:var(--accent-coral)]/10">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-4 w-28 animate-pulse rounded bg-surface" />
                            <div className="h-5 w-full animate-pulse rounded bg-surface" />
                            <div className="h-5 w-11/12 animate-pulse rounded bg-surface" />
                            <div className="h-5 w-10/12 animate-pulse rounded bg-surface" />
                        </div>
                    ) : statement ? (
                        <>
                            <p className="text-lg leading-8 text-foreground">{statement.identity_statement}</p>
                            <p className="mt-4 text-xs text-muted">
                                Dica: voce pode copiar esse texto, ajustar depois e ate usar como base para seu LinkedIn ou resumo profissional.
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted">Sua leitura de identidade ainda nao ficou pronta.</p>
                    )}
                </div>

                {error && <p className="mt-4 rounded-xl border border-rose-300/60 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}

                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={regenerating || loading || !onboardingId}
                        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-blue)]/12 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-[color:var(--accent-blue)]/18 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                        {regenerating ? "Gerando de novo..." : "Gerar de novo"}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!statement?.identity_statement}
                        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent-mint)]/12 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-[color:var(--accent-mint)]/18 disabled:opacity-60"
                    >
                        <Copy className="h-4 w-4" />
                        {copied ? "Copiado" : "Copiar texto"}
                    </button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <article className="app-card p-5">
                    <p className="text-xs uppercase tracking-widest text-muted">Comece agora</p>
                    <h2 className="mt-2 text-xl font-black text-foreground">Sua trilha gratis ja esta pronta</h2>
                    <p className="mt-2 text-sm text-muted">Se quiser seguir pelo caminho mais simples, seu painel ja vai te levar direto para a proxima etapa.</p>
                    <Link href={continueHref} className="mt-4 inline-flex rounded-full bg-[var(--accent-purple)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
                        Ir para o dashboard
                    </Link>
                </article>

                <article className="app-card p-5">
                    <p className="text-xs uppercase tracking-widest text-muted">Enquanto isso</p>
                    <h2 className="mt-2 text-xl font-black text-foreground">Sua trilha por IA esta sendo montada</h2>
                    <p className="mt-2 text-sm text-muted">Se quiser acompanhar o processo de perto, voce pode abrir a tela de geracao dramatica ou entrar direto na trilha gratis.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link href={generatingHref} className="inline-flex rounded-full bg-[color:var(--accent-coral)]/12 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[color:var(--accent-coral)]/18">
                            Acompanhar geracao
                        </Link>
                        <Link href={standardHref} className="inline-flex rounded-full bg-[color:var(--accent-blue)]/12 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-[color:var(--accent-blue)]/18">
                            Abrir trilha gratis
                        </Link>
                    </div>
                </article>
            </section>
        </div>
    );
}