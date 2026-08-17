"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { extractOnboardingSubmitMessage, useBackendApi } from "@/lib/api";
import type { CareerType, GoalType, OnboardingPayload } from "@/lib/types";

const CAREER_TYPE_OPTIONS: Array<{ value: CareerType; label: string; description: string }> = [
    { value: "TECH", label: "Tecnologia", description: "Engenharia, dados, cloud, produto tecnico." },
    { value: "DESIGN", label: "Design", description: "UX, UI, produto, design visual." },
    { value: "MARKETING", label: "Marketing", description: "Conteudo, growth, midia, marca." },
    { value: "SALES", label: "Vendas", description: "Inside sales, account exec, revenue." },
    { value: "FINANCE", label: "Financas", description: "FP&A, controladoria, analise financeira." },
    { value: "OPERATIONS", label: "Operacoes", description: "Processos, projetos, eficiencia." },
    { value: "OTHER", label: "Outro", description: "Area diferente das opcoes acima." },
];

const GOAL_OPTIONS: Array<{ value: GoalType; label: string; description: string }> = [
    { value: "GROW_CURRENT_JOB", label: "Crescer no emprego atual", description: "Subir de nivel e ganhar mais impacto onde voce ja esta." },
    { value: "SWITCH_JOB", label: "Trocar de emprego", description: "Migrar para uma nova funcao com plano pratico." },
    { value: "FIND_JOB_ABROAD", label: "Encontrar vaga fora do pais", description: "Conseguir oportunidade internacional remota ou presencial." },
    { value: "MOVE_ABROAD", label: "Morar fora", description: "Construir trilha para realocacao com carreira." },
];

const EXPERIENCE_OPTIONS = ["Iniciante", "Intermediario", "Avancado"];
const WEEKLY_TIME_OPTIONS = [3, 5, 7, 10, 14, 20];

export default function OnboardingPage() {
    const api = useBackendApi();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<OnboardingPayload>({
        current_job: "",
        dream_job: "",
        career_type: "TECH",
        goal: "GROW_CURRENT_JOB",
        experience_level: "Iniciante",
        weekly_time_availability: 5,
    });

    const progress = useMemo(() => ((step + 1) / 6) * 100, [step]);

    function next() {
        if (step === 0 && form.current_job.trim().length < 2) {
            setError("Informe seu emprego atual.");
            return;
        }

        setError(null);
        setStep((prev) => Math.min(prev + 1, 5));
    }

    function previous() {
        setError(null);
        setStep((prev) => Math.max(prev - 1, 0));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (form.current_job.trim().length < 2) {
            setError("Informe seu emprego atual.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload: OnboardingPayload = {
                ...form,
                dream_job: form.dream_job?.trim() ? form.dream_job.trim() : null,
            };
            await api.createOnboarding(payload);
            router.push("/trilha/escolha");
        } catch (e) {
            setError(extractOnboardingSubmitMessage(e));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 md:p-8">
            <div className="mb-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Onboarding</p>
                <h1 className="mt-2 text-2xl font-black text-zinc-100">Vamos desenhar sua trilha personalizada</h1>
                <div className="mt-4 h-2 w-full rounded bg-zinc-800">
                    <div className="h-full rounded bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {step === 0 && (
                <section>
                    <label className="text-sm text-zinc-300">Qual e seu emprego atual?</label>
                    <input
                        className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-teal-400"
                        value={form.current_job}
                        onChange={(e) => setForm((prev) => ({ ...prev, current_job: e.target.value }))}
                        placeholder="Ex: Analista de suporte"
                    />
                </section>
            )}

            {step === 1 && (
                <section className="grid gap-3 md:grid-cols-2">
                    {CAREER_TYPE_OPTIONS.map((option) => {
                        const active = form.career_type === option.value;
                        return (
                            <button
                                type="button"
                                key={option.value}
                                onClick={() => setForm((prev) => ({ ...prev, career_type: option.value }))}
                                className={`rounded-xl border p-4 text-left transition ${active ? "border-teal-400 bg-teal-600/20" : "border-zinc-700 bg-zinc-900 hover:border-teal-500/60"}`}
                            >
                                <p className="font-semibold text-zinc-100">{option.label}</p>
                                <p className="mt-1 text-sm text-zinc-400">{option.description}</p>
                            </button>
                        );
                    })}
                </section>
            )}

            {step === 2 && (
                <section>
                    <label className="text-sm text-zinc-300">Qual e seu emprego dos sonhos? (opcional)</label>
                    <input
                        className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-teal-400"
                        value={form.dream_job ?? ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, dream_job: e.target.value }))}
                        placeholder="Ex: Cloud Engineer"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setForm((prev) => ({ ...prev, dream_job: "" }));
                            next();
                        }}
                        className="mt-3 text-sm text-teal-300 hover:text-teal-200"
                    >
                        Pular essa pergunta
                    </button>
                </section>
            )}

            {step === 3 && (
                <section className="grid gap-3 md:grid-cols-2">
                    {GOAL_OPTIONS.map((option) => {
                        const active = form.goal === option.value;
                        return (
                            <button
                                type="button"
                                key={option.value}
                                onClick={() => setForm((prev) => ({ ...prev, goal: option.value }))}
                                className={`rounded-xl border p-4 text-left transition ${active ? "border-teal-400 bg-teal-600/20" : "border-zinc-700 bg-zinc-900 hover:border-teal-500/60"}`}
                            >
                                <p className="font-semibold text-zinc-100">{option.label}</p>
                                <p className="mt-1 text-sm text-zinc-400">{option.description}</p>
                            </button>
                        );
                    })}
                </section>
            )}

            {step === 4 && (
                <section className="grid gap-3 md:grid-cols-3">
                    {EXPERIENCE_OPTIONS.map((level) => {
                        const active = form.experience_level === level;
                        return (
                            <button
                                type="button"
                                key={level}
                                onClick={() => setForm((prev) => ({ ...prev, experience_level: level }))}
                                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${active ? "border-teal-400 bg-teal-600/20 text-teal-100" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-teal-500/60"}`}
                            >
                                {level}
                            </button>
                        );
                    })}
                </section>
            )}

            {step === 5 && (
                <section>
                    <label className="text-sm text-zinc-300">Quanto tempo por semana voce tem para estudar?</label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {WEEKLY_TIME_OPTIONS.map((hours) => {
                            const active = form.weekly_time_availability === hours;
                            return (
                                <button
                                    type="button"
                                    key={hours}
                                    onClick={() => setForm((prev) => ({ ...prev, weekly_time_availability: hours }))}
                                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${active ? "border-teal-400 bg-teal-600/20 text-teal-100" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-teal-500/60"}`}
                                >
                                    {hours}h / semana
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {error && <p className="mt-5 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}

            <footer className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    onClick={previous}
                    disabled={step === 0 || submitting}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Voltar
                </button>

                {step < 5 ? (
                    <button type="button" onClick={next} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400">
                        Continuar
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:opacity-60"
                    >
                        {submitting ? "Criando seus caminhos..." : "Criar meus caminhos"}
                    </button>
                )}
            </footer>
        </form>
    );
}
