"use client";

import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Crown, Lock, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { extractApiMessage } from "@/lib/api";
import { useMyCareerPathsQuery, usePaywallTeaserQuery } from "@/lib/backend-queries";
import {
    getJobsTeaserCards,
    getLockedStepContext,
    getPersonalizedBullets,
    getPersonalizedHeadline,
    getStatementAnchor,
    getUnlockCopy,
} from "@/lib/paywall-personalization";
import type { CareerPath, OnboardingContextResponse, PaywallTeaserResponse } from "@/lib/types";

export default function PaywallPage() {
    const pathsQuery = useMyCareerPathsQuery();
    const teaserQuery = usePaywallTeaserQuery();
    const [error, setError] = useState<string | null>(null);
    const queryError = pathsQuery.error ?? teaserQuery.error;
    const resolvedError = error ?? (queryError ? extractApiMessage(queryError, "Nao foi possivel carregar detalhes da trilha.") : null);

    const path: CareerPath | null = useMemo(
        () => (pathsQuery.data ?? []).find((item) => item.kind === "AI_PERSONALIZED") ?? null,
        [pathsQuery.data],
    );
    const teaser: PaywallTeaserResponse | null = teaserQuery.data ?? null;
    const context: OnboardingContextResponse | null = teaser?.onboarding_context ?? null;

    const lockedPreview = useMemo(() => {
        if (!path) {
            return [];
        }
        return path.steps.filter((step) => step.status === "LOCKED").slice(0, 3);
    }, [path]);

    const bullets = useMemo(() => getPersonalizedBullets(context), [context]);
    const headline = useMemo(() => getPersonalizedHeadline(context), [context]);
    const anchorCopy = useMemo(() => getStatementAnchor(context), [context]);
    const unlockCopy = useMemo(() => getUnlockCopy(context), [context]);
    const jobsTeaserCards = useMemo(() => getJobsTeaserCards(context), [context]);
    const salaryBenchmark = teaser?.salary_benchmark ?? null;
    const liveJobs = teaser?.live_jobs ?? null;

    function formatBrl(value: number): string {
        return value.toLocaleString("pt-BR");
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <section className="app-card relative overflow-hidden bg-background/90 p-8 backdrop-blur">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent-purple/18 blur-3xl" />
                <div className="absolute left-10 top-10 h-16 w-16 rounded-full bg-accent-coral/18 blur-2xl" />

                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-blue">
                            <Sparkles className="h-3.5 w-3.5" />
                            Primeira etapa concluida
                        </div>
                        <h1 className="mt-4 text-3xl font-black leading-tight text-foreground md:text-4xl">{headline}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                            Sua versao premium destrava a trilha personalizada completa com continuidade real a partir do que voce ja comecou.
                        </p>
                    </div>

                    <div className="relative flex h-18 w-18 items-center justify-center rounded-3xl border border-accent-purple/30 bg-accent-purple/12 text-accent-purple shadow-[0_18px_40px_rgba(155,114,242,0.22)]">
                        <span className="absolute inset-0 rounded-3xl border border-accent-coral/25 animate-pulse" />
                        <Crown className="relative z-10 h-8 w-8" />
                    </div>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <section className="app-card p-7">
                    <p className="text-xs uppercase tracking-[0.24em] text-accent-purple">O que a IA vai montar pra voce</p>
                    <p className="mt-4 rounded-2xl border border-border bg-surface/65 p-4 text-sm leading-7 text-foreground">
                        {anchorCopy}
                    </p>

                    <div className="mt-5 space-y-3">
                        {bullets.map((bullet) => (
                            <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-border bg-surface/55 p-4">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-mint" />
                                <p className="text-sm leading-6 text-foreground">{bullet}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="app-card p-7">
                    <p className="text-xs uppercase tracking-[0.24em] text-accent-coral">Faixa de mercado</p>
                    <h2 className="mt-3 text-2xl font-black text-foreground">
                        {salaryBenchmark ? salaryBenchmark.role_title : "Benchmark salarial em curadoria"}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted">
                        {salaryBenchmark
                            ? `Faixa de mercado para esse tipo de posicao em ${salaryBenchmark.region}, com parte do teto ocultada ate a assinatura.`
                            : "Ainda estamos curando uma faixa salarial verificada para este perfil. Quando nao ha fonte publica suficiente, preferimos nao exibir numero."}
                    </p>

                    {salaryBenchmark && (
                        <div className="mt-5 rounded-3xl border border-accent-blue/20 bg-accent-blue/8 p-5">
                            <p className="text-xs uppercase tracking-[0.24em] text-accent-blue">Teaser salarial</p>
                            <p className="mt-2 text-3xl font-black text-foreground">
                                <span>R$ {formatBrl(salaryBenchmark.visible_salary_min)} - </span>
                                <span className="relative inline-flex items-center">
                                    <span className="select-none blur-[7px]">R$ {salaryBenchmark.visible_salary_max_hint}/ano</span>
                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-background/35 to-background/80" />
                                </span>
                            </p>
                            <p className="mt-2 text-sm text-muted">Assine pra ver a faixa completa e como chegar la.</p>
                            <p className="mt-4 text-xs text-muted">
                                Estimativa baseada em dados publicos de {salaryBenchmark.source}, {new Date(salaryBenchmark.updated_at).getFullYear()}.
                            </p>
                            <p className="mt-2 text-xs leading-5 text-muted">
                                Valores de referencia baseados em dados publicos de mercado. Podem variar por empresa, senioridade e regiao.
                            </p>
                        </div>
                    )}

                    <div className="mt-5 rounded-2xl border border-border bg-surface/55 p-4">
                        <p className="text-sm leading-6 text-foreground">
                            A faixa salarial acima e o destino. Sua trilha personalizada e o caminho ate la.
                        </p>
                    </div>
                </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <section className="app-card p-7">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-accent-mint">Vagas reais</p>
                            <h2 className="mt-2 text-2xl font-black text-foreground">Vagas atualizadas te esperam</h2>
                        </div>
                        <BriefcaseBusiness className="h-6 w-6 text-accent-mint" />
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted">
                        Nao mantemos banco proprio de vagas no MVP. Quando voce quiser explorar o mercado real, usamos uma busca ao vivo filtrada pelo cargo mais proximo do seu objetivo.
                    </p>

                    <div className="mt-5 space-y-3">
                        {jobsTeaserCards.map((item) => (
                            <article key={`${item.role_title}-${item.company_label}`} className="rounded-2xl border border-border bg-surface/60 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Preview estilizado</p>
                                <p className="relative mt-2 text-base font-bold text-foreground">
                                    <span className="select-none blur-[6px]">{item.role_title}</span>
                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-background/30 to-background/75" />
                                </p>
                                <p className="relative mt-1 text-sm text-muted">
                                    <span className="select-none blur-[5px]">{item.company_label}</span>
                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-background/25 to-background/70" />
                                </p>
                            </article>
                        ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        {liveJobs && (
                            <a
                                href={liveJobs.search_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-accent-mint/35 bg-accent-mint/10 px-4 py-2 text-sm font-semibold text-foreground hover:border-accent-mint"
                            >
                                Ver vagas reais no {liveJobs.provider}
                                <ArrowUpRight className="h-4 w-4" />
                            </a>
                        )}
                        <p className="text-xs text-muted">Vagas reais te esperam - assine pra ver o caminho com contexto completo.</p>
                    </div>
                </section>

                <section className="app-card p-7">
                    <p className="text-xs uppercase tracking-[0.24em] text-accent-coral">Desbloqueio premium</p>
                    <h2 className="mt-3 text-2xl font-black text-foreground">Continue sua trilha sem perder o momento</h2>
                    <p className="mt-3 text-sm leading-7 text-muted">{unlockCopy}</p>

                    <div className="mt-6 space-y-3">
                        <button className="w-full rounded-2xl bg-accent px-5 py-3 text-base font-bold text-white shadow-[0_14px_30px_rgba(75,123,236,0.28)] transition hover:-translate-y-0.5 hover:bg-accent-hover">
                            Assinar
                        </button>
                        <p className="text-center text-xs leading-5 text-muted">
                            {unlockCopy}
                        </p>
                        <Link href="/constelacao" className="block text-center text-sm font-semibold text-accent-blue hover:text-accent-hover">
                            Voltar para a constelacao
                        </Link>
                    </div>
                </section>
            </div>

            {resolvedError && <p className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{resolvedError}</p>}

            <section className="app-card p-7">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-accent-blue">Preview bloqueado</p>
                        <h2 className="mt-2 text-2xl font-black text-foreground">O que vem nas proximas etapas</h2>
                    </div>
                    <span className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-semibold text-muted">
                        {lockedPreview.length} etapas bloqueadas em destaque
                    </span>
                </div>

                <div className="mt-6 space-y-3">
                    {lockedPreview.map((step) => (
                        <article key={step.id} className="rounded-2xl border border-border bg-surface/80 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted">Etapa {step.order_index + 1}</p>
                                    <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full border border-accent-coral/30 bg-accent-coral/10 px-2.5 py-1 text-[11px] font-semibold text-accent-coral">
                                    <Lock className="h-3.5 w-3.5" />
                                    Premium
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted">{getLockedStepContext(step)}</p>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent-blue">Liberada no plano completo</p>
                        </article>
                    ))}

                    {lockedPreview.length === 0 && (
                        <article className="rounded-2xl border border-dashed border-border bg-surface/55 p-5">
                            <h3 className="text-lg font-semibold text-foreground">Sua trilha premium aparece aqui</h3>
                            <p className="mt-2 text-sm leading-6 text-muted">
                                Assim que a trilha personalizada terminar de carregar, voce vai ver o contexto real das proximas etapas bloqueadas nesta area.
                            </p>
                        </article>
                    )}
                </div>
            </section>
        </div>
    );
}
