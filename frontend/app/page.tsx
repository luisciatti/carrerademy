import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CheckCircle, ChevronDown, Compass, CreditCard, Lock, MessageSquare, Shield, Sparkles, Zap } from "lucide-react";

const PRIMARY_CTA_LOGGED_IN = "/dashboard";
const PRIMARY_CTA_VISITOR = "/sign-up";

const DIFF_ITEMS = [
  {
    icon: <Compass className="h-6 w-6 text-teal-400" />,
    title: "Sobre você, não sobre uma prova",
    body: "Sua trilha é montada a partir do seu emprego atual, seu objetivo e seu tempo disponível — não é uma lista padrão de tópicos pra decorar.",
  },
  {
    icon: <Zap className="h-6 w-6 text-teal-400" />,
    title: "Comece sem esperar",
    body: "Sua primeira trilha de habilidades aparece na hora, gratuita, enquanto sua trilha personalizada por IA é gerada em segundo plano.",
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-teal-400" />,
    title: "Aprenda fazendo, não só lendo",
    body: "Simulações de conversa, desafios práticos e quizzes — não só vídeo e texto pra passar os olhos.",
  },
] as const;

const HOW_STEPS = [
  {
    n: "1",
    title: "Conte sua situação",
    body: "Emprego atual, objetivo (crescer onde está, trocar de área, ir pra fora) e quanto tempo você tem por semana.",
  },
  {
    n: "2",
    title: "Comece na hora, de graça",
    body: "Sua trilha de habilidades essenciais já está pronta — sem esperar, sem pagar.",
  },
  {
    n: "3",
    title: "Receba sua trilha personalizada",
    body: "Enquanto isso, a IA monta uma trilha específica pro seu objetivo, combinando o melhor conteúdo disponível com o seu contexto real.",
  },
] as const;

const ACTIVITY_CARDS = [
  {
    label: "Simulador de conversa",
    caption: "Pratique conversas difíceis antes de tê-las de verdade.",
    accent: "border-teal-700/40 bg-teal-950/20",
    preview: (
      <div className="mt-3 space-y-2 rounded-xl border border-teal-800/30 bg-surface/60 p-3 text-xs">
        <p className="text-muted uppercase tracking-wide">Colega</p>
        <p className="text-foreground">Não entendi por que você marcou esta conversa.</p>
        <div className="mt-2 grid gap-1.5">
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-muted">Você interrompe demais nas reuniões.</div>
          <div className="rounded-lg border border-teal-500/50 bg-teal-500/10 px-3 py-1.5 text-teal-100">Quero alinhar um ponto pra trabalharmos melhor.</div>
        </div>
      </div>
    ),
  },
  {
    label: "Cenário arrastar e organizar",
    caption: "Aplique o conceito na prática, não só leia sobre ele.",
    accent: "border-violet-700/40 bg-violet-950/20",
    preview: (
      <div className="mt-3 space-y-1.5 text-xs">
        {["Preparar contexto e exemplos", "Ouvir a percepção da pessoa", "Compartilhar feedback objetivo", "Combinar próximos passos"].map((item, i) => (
          <div key={item} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${i === 1 ? "border-teal-500/50 bg-teal-500/10 text-teal-100" : "border-border bg-surface text-muted"}`}>
            <span className="w-4 text-center font-bold text-muted">{i + 1}</span>
            {item}
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Mapa da trilha",
    caption: "Veja exatamente onde você está e o que vem a seguir.",
    accent: "border-emerald-700/40 bg-emerald-950/20",
    preview: (
      <div className="mt-3 flex flex-col items-center gap-3 py-1 text-xs">
        {[
          { label: "Comunicação assertiva", done: true },
          { label: "Feedback eficaz", active: true },
          { label: "Gestão de conflito", done: false },
        ].map(({ label, done, active }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold ${done ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : active ? "border-teal-300 bg-teal-500/20 text-teal-100 shadow-[0_0_20px_rgba(20,184,166,0.3)]" : "border-border bg-surface text-muted"}`}>
              {done ? <CheckCircle className="h-4 w-4" /> : <span className="text-[10px]">{active ? "●" : "○"}</span>}
            </div>
            <span className={done ? "text-emerald-300" : active ? "font-semibold text-foreground" : "text-muted"}>{label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Trilha por tipo de carreira",
    caption: "Tech, Design, Marketing, Vendas, Financeiro, Operações — a trilha muda com você.",
    accent: "border-amber-700/40 bg-amber-950/20",
    preview: (
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
        {["Tech", "Design", "Marketing", "Vendas", "Financas", "Operacoes"].map((label, i) => (
          <div key={label} className={`rounded-lg border px-2 py-1.5 text-center font-semibold ${i === 0 ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-border bg-surface text-muted"}`}>
            {label}
          </div>
        ))}
      </div>
    ),
  },
] as const;

const COMPARE_ROWS = [
  { feature: "Custo", free: "Sempre grátis", ai: "Assinatura" },
  { feature: "Baseada em", free: "Seu tipo de carreira", ai: "Seu objetivo específico e contexto completo" },
  { feature: "Disponibilidade", free: "Instantânea", ai: "Gerada em minutos" },
  { feature: "Conteúdo", free: "Quizzes, simulações, vídeos", ai: "Tudo isso, sequenciado especificamente pra você" },
] as const;

const TRUST_ITEMS = [
  { icon: <Lock className="h-4 w-4" />, label: "Login seguro", sub: "via Clerk" },
  { icon: <CreditCard className="h-4 w-4" />, label: "Pagamento protegido", sub: "via Stripe" },
  { icon: <Shield className="h-4 w-4" />, label: "Seus dados, sua decisão", sub: "política de privacidade" },
] as const;

export default async function Home() {
  const { userId } = await auth();
  const ctaHref = userId ? PRIMARY_CTA_LOGGED_IN : PRIMARY_CTA_VISITOR;

  return (
    <div className="min-h-screen text-foreground">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-black tracking-tight text-accent">CarrerAdemy</span>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-muted hover:text-accent">Entrar</Link>
            <Link href={ctaHref} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── 1. Hero ───────────────────────────────────────────── */}
        <section id="hero" className="mx-auto max-w-6xl px-6 py-24 md:py-36">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full border border-teal-800/50 bg-teal-950/40 px-3 py-1 text-xs font-medium text-teal-300">
              Grátis para começar · Sem cartão de crédito
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-foreground md:text-6xl">
              Sua carreira não é genérica.{" "}
              <span className="text-teal-400">Sua trilha também não deveria ser.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted">
              Responda algumas perguntas sobre onde você está e onde quer chegar. Em segundos, você já tem uma trilha prática pra começar — e uma trilha personalizada por IA sendo montada só pra você.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-teal-400">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-teal-500/60">
                Ver como funciona <ChevronDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Trail map preview: transparent so the body gradient shows through */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-teal-900/40 bg-transparent p-6 ring-1 ring-inset ring-teal-900/20 shadow-[0_0_80px_rgba(13,148,136,0.12)]">
            <p className="mb-4 text-xs uppercase tracking-widest text-muted">Prévia do mapa da trilha</p>
            <div className="relative mx-auto flex max-w-lg flex-col items-center gap-6 py-2">
              <div className="absolute left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed border-teal-700/40" />
              {[
                { label: "Comunicação assertiva", status: "done", side: "left" },
                { label: "Feedback eficaz", status: "active", side: "right" },
                { label: "Gestão de conflito", status: "locked", side: "left" },
                { label: "Negociação de prazo", status: "locked", side: "right" },
              ].map(({ label, status, side }) => (
                <div key={label} className={`relative z-10 flex w-full items-center gap-4 ${side === "right" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${status === "done" ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : status === "active" ? "border-teal-300 bg-teal-500/20 text-teal-100 shadow-[0_0_28px_rgba(20,184,166,0.35)]" : "border-border bg-surface text-muted"}`}>
                    {status === "done" ? <CheckCircle className="h-5 w-5" /> : status === "active" ? "●" : "○"}
                  </div>
                  <div className={`w-52 rounded-2xl border p-3 ${status === "done" ? "border-emerald-800/40 bg-emerald-950/20" : status === "active" ? "border-teal-700/50 bg-teal-950/30" : "border-border bg-surface/40 opacity-50"}`}>
                    <p className={`text-sm font-semibold ${status === "active" ? "text-foreground" : status === "done" ? "text-emerald-200" : "text-muted"}`}>{label}</p>
                    {status === "active" && <p className="mt-0.5 text-xs text-teal-300">Você está aqui</p>}
                    {status === "done" && <p className="mt-0.5 text-xs text-emerald-400">Concluída</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. Diferenciação ─────────────────────────────────── */}
        <section className="border-y border-border/40 bg-surface/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
            {DIFF_ITEMS.map(({ icon, title, body }) => (
              <div key={title} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-800/40 bg-teal-950/30">
                  {icon}
                </div>
                <h3 className="font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Como funciona ─────────────────────────────────── */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-xs uppercase tracking-widest text-muted">Como funciona</p>
          <h2 className="mt-2 text-3xl font-black text-foreground md:text-4xl">Três perguntas. Duas trilhas. Uma direção.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {HOW_STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative rounded-2xl border border-border/60 bg-surface/40 p-6">
                <span className="text-6xl font-black text-teal-500/20 leading-none select-none">{n}</span>
                <h3 className="mt-2 font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Vitrine de atividades ─────────────────────────── */}
        <section className="border-y border-border/40 bg-surface/30">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="text-xs uppercase tracking-widest text-muted">Atividades</p>
            <h2 className="mt-2 text-3xl font-black text-foreground md:text-4xl">Não é só assistir. É praticar.</h2>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Cada etapa da trilha combina tipos diferentes de atividade pra você absorver e aplicar — não só marcar como lido.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ACTIVITY_CARDS.map(({ label, caption, accent, preview }) => (
                <div key={label} className={`rounded-2xl border p-4 ${accent}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
                  {preview}
                  <p className="mt-4 text-xs text-zinc-400">{caption}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Tabela comparativa ────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-xs uppercase tracking-widest text-muted">Planos</p>
          <h2 className="mt-2 text-3xl font-black text-foreground md:text-4xl">Grátis de verdade. Premium quando fizer sentido.</h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="w-1/3 pb-4 text-left text-xs uppercase tracking-widest text-muted" />
                  <th className="pb-4 text-center">
                    <div className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">Trilha de Habilidades</div>
                    <p className="mt-1 text-xs text-muted">Sempre grátis</p>
                  </th>
                  <th className="pb-4 text-center">
                    <div className="inline-block rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-300">Trilha por IA</div>
                    <p className="mt-1 text-xs text-muted">Assinatura</p>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {COMPARE_ROWS.map(({ feature, free, ai }) => (
                  <tr key={feature}>
                    <td className="py-4 font-semibold text-foreground">{feature}</td>
                    <td className="py-4 text-center text-muted">{free}</td>
                    <td className="py-4 text-center text-teal-300">{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-teal-400">
              Comece pela trilha grátis — sem compromisso <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── 6. Confiança ─────────────────────────────────────── */}
        <section className="border-t border-border/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-6 py-10">
            {TRUST_ITEMS.map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="text-zinc-500">{icon}</span>
                <span>{label}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 text-xs">{sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. CTA final ─────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-28 text-center">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-teal-400 opacity-70" />
          <h2 className="text-3xl font-black text-foreground md:text-5xl">
            Sua próxima etapa de carreira começa com uma pergunta,{" "}
            <span className="text-teal-400">não com uma mensalidade.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Crie sua conta em segundos e comece a trilha hoje.
          </p>
          <Link href={ctaHref} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-4 text-base font-bold text-zinc-950 hover:bg-teal-400">
            Começar agora, de graça <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted">Sem cartão de crédito. Sem contrato.</p>
        </section>
      </main>

      {/* ── 8. Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-zinc-500">
          <span className="font-black tracking-tight text-teal-300">CarrerAdemy</span>
          <nav className="flex flex-wrap gap-4">
            <Link href="#" className="hover:text-zinc-300">Sobre</Link>
            <Link href="#" className="hover:text-zinc-300">Contato</Link>
            <Link href="#" className="hover:text-zinc-300">Termos de uso</Link>
            <Link href="#" className="hover:text-zinc-300">Privacidade</Link>
          </nav>
          <span>© {new Date().getFullYear()} CarrerAdemy</span>
        </div>
      </footer>
    </div>
  );
}
