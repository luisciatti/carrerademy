import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CheckCircle, ChevronDown, Compass, CreditCard, Lock, MessageSquare, Shield, Sparkles, Zap } from "lucide-react";

const PRIMARY_CTA_LOGGED_IN = "/dashboard";
const PRIMARY_CTA_VISITOR = "/sign-up";

const DIFF_ITEMS = [
  {
    icon: <Compass className="h-6 w-6 text-accent-blue" />,
    title: "Sobre você, não sobre uma prova",
    body: "Sua trilha é montada a partir do seu emprego atual, seu objetivo e seu tempo disponível — não é uma lista padrão de tópicos pra decorar.",
  },
  {
    icon: <Zap className="h-6 w-6 text-accent-purple" />,
    title: "Comece sem esperar",
    body: "Sua primeira trilha de habilidades aparece na hora, gratuita, enquanto sua trilha personalizada por IA é gerada em segundo plano.",
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-accent-mint" />,
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
    accent: "border-accent-blue/35 bg-accent-blue/10",
    preview: (
      <div className="mt-3 space-y-2 rounded-xl border border-accent-blue/30 bg-surface/70 p-3 text-xs">
        <p className="text-muted uppercase tracking-wide">Colega</p>
        <p className="text-foreground">Não entendi por que você marcou esta conversa.</p>
        <div className="mt-2 grid gap-1.5">
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-muted">Você interrompe demais nas reuniões.</div>
          <div className="rounded-lg border border-accent-blue/50 bg-accent-blue/12 px-3 py-1.5 text-accent-blue">Quero alinhar um ponto pra trabalharmos melhor.</div>
        </div>
      </div>
    ),
  },
  {
    label: "Cenário arrastar e organizar",
    caption: "Aplique o conceito na prática, não só leia sobre ele.",
    accent: "border-accent-purple/35 bg-accent-purple/10",
    preview: (
      <div className="mt-3 space-y-1.5 text-xs">
        {["Preparar contexto e exemplos", "Ouvir a percepção da pessoa", "Compartilhar feedback objetivo", "Combinar próximos passos"].map((item, i) => (
          <div key={item} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${i === 1 ? "border-accent-purple/50 bg-accent-purple/12 text-accent-purple" : "border-border bg-surface text-muted"}`}>
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
    accent: "border-accent-mint/35 bg-accent-mint/10",
    preview: (
      <div className="mt-3 flex flex-col items-center gap-3 py-1 text-xs">
        {[
          { label: "Comunicação assertiva", done: true },
          { label: "Feedback eficaz", active: true },
          { label: "Gestão de conflito", done: false },
        ].map(({ label, done, active }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold ${done ? "border-accent-mint/60 bg-accent-mint/20 text-accent-mint" : active ? "border-accent-blue/50 bg-accent-blue/20 text-accent-blue shadow-[0_0_20px_rgba(75,123,236,0.3)]" : "border-border bg-surface text-muted"}`}>
              {done ? <CheckCircle className="h-4 w-4" /> : <span className="text-[10px]">{active ? "●" : "○"}</span>}
            </div>
            <span className={done ? "text-accent-mint" : active ? "font-semibold text-foreground" : "text-muted"}>{label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Trilha por tipo de carreira",
    caption: "Tech, Design, Marketing, Vendas, Financeiro, Operações — a trilha muda com você.",
    accent: "border-accent-coral/35 bg-accent-coral/10",
    preview: (
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
        {["Tech", "Design", "Marketing", "Vendas", "Financas", "Operacoes"].map((label, i) => (
          <div key={label} className={`rounded-lg border px-2 py-1.5 text-center font-semibold ${i === 0 ? "border-accent-coral/50 bg-accent-coral/15 text-accent-coral" : "border-border bg-surface text-muted"}`}>
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
            <Link href={ctaHref} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── 1. Hero ───────────────────────────────────────────── */}
        <section id="hero" className="mx-auto max-w-6xl px-6 py-24 md:py-36">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full border border-accent-blue/35 bg-accent-blue/10 px-3 py-1 text-xs font-medium text-accent-blue">
              Grátis para explorar · Sem cartão de crédito
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-foreground md:text-6xl">
              Vamos descobrir seu próximo passo{" "}
              <span className="text-accent-blue">sem cair num formulário engessado.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted">
              Você conta onde está, para onde quer ir e quanto tempo realmente cabe na sua semana. A partir daí, o CarrerAdemy abre uma trilha grátis na hora e prepara sua constelação personalizada em segundo plano.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-hover">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-accent-blue/50">
                Ver como funciona <ChevronDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-16 overflow-hidden rounded-3xl border border-accent-blue/20 bg-gradient-to-br from-white/75 via-accent-purple/12 to-accent-mint/10 p-6 ring-1 ring-inset ring-accent-blue/15 shadow-[0_0_80px_rgba(75,123,236,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-sm">
                <p className="mb-2 text-xs uppercase tracking-widest text-muted">Prévia da constelação</p>
                <h3 className="text-2xl font-black text-foreground">Sua carreira vira um mapa vivo, não uma lista parada.</h3>
                <p className="mt-2 text-sm text-muted">Cada planeta é uma trilha. Algumas já estão prontas para começar, outras aparecem como possibilidades novas conforme você evolui.</p>
              </div>
              <div className="rounded-full border border-accent-blue/30 bg-white/75 px-3 py-1 text-xs font-semibold text-accent-blue">
                Explore antes de se comprometer
              </div>
            </div>
            <div className="relative mx-auto mt-8 h-[24rem] max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-background/45">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(75,123,236,0.12),transparent_58%)]" />
              {[
                { title: "Trilha IA", subtitle: "Seu objetivo real", left: "44%", top: "18%", size: "h-24 w-24", active: true },
                { title: "Comunicação", subtitle: "Em andamento", left: "20%", top: "42%", size: "h-20 w-20" },
                { title: "Feedback", subtitle: "Pronta para abrir", left: "68%", top: "40%", size: "h-20 w-20" },
                { title: "Conflitos", subtitle: "Desbloqueia depois", left: "38%", top: "68%", size: "h-16 w-16", muted: true },
                { title: "Negociação", subtitle: "Nova possibilidade", left: "74%", top: "72%", size: "h-16 w-16", muted: true },
              ].map((planet) => (
                <div key={planet.title} className="absolute" style={{ left: planet.left, top: planet.top }}>
                  <div className={`relative -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${planet.size} ${planet.active ? "border-accent-blue/60 bg-gradient-to-br from-accent-blue to-accent-purple shadow-[0_0_36px_rgba(75,123,236,0.38)]" : planet.muted ? "border-border bg-surface text-muted opacity-70" : "border-accent-mint/55 bg-gradient-to-br from-accent-mint to-accent-blue shadow-[0_0_24px_rgba(46,217,165,0.22)]"}`} />
                  <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.75rem)] w-32 -translate-x-1/2 text-center">
                    <p className="text-xs font-bold text-foreground">{planet.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{planet.subtitle}</p>
                  </div>
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <line x1="45%" y1="22%" x2="24%" y2="45%" stroke="rgba(75,123,236,0.24)" strokeWidth="2" />
                <line x1="45%" y1="22%" x2="70%" y2="43%" stroke="rgba(155,114,242,0.22)" strokeWidth="2" />
                <line x1="24%" y1="45%" x2="40%" y2="70%" stroke="rgba(46,217,165,0.2)" strokeWidth="2" strokeDasharray="5 6" />
                <line x1="70%" y1="43%" x2="75%" y2="74%" stroke="rgba(255,126,103,0.2)" strokeWidth="2" strokeDasharray="5 6" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── 2. Diferenciação ─────────────────────────────────── */}
        <section className="border-y border-border/40 bg-surface/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
            {DIFF_ITEMS.map(({ icon, title, body }) => (
              <div key={title} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-blue/30 bg-accent-blue/10">
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
          <h2 className="mt-2 text-3xl font-black text-foreground md:text-4xl">Poucas respostas. Mais clareza sobre por onde começar.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {HOW_STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative rounded-2xl border border-border/60 bg-surface/40 p-6">
                <span className="text-6xl font-black text-accent-blue/20 leading-none select-none">{n}</span>
                <h3 className="mt-2 font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Vitrine de atividades ─────────────────────────── */}
        <section className="border-y border-border/40 bg-surface/30">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="text-xs uppercase tracking-widest text-muted">Atividades + constelação</p>
            <h2 className="mt-2 text-3xl font-black text-foreground md:text-4xl">Você não recebe só conteúdo. Recebe um universo para explorar.</h2>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              A constelação mostra o panorama da sua evolução, e cada etapa mistura formatos diferentes para você entender, testar e aplicar no mundo real.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ACTIVITY_CARDS.map(({ label, caption, accent, preview }) => (
                <div key={label} className={`rounded-2xl border p-4 ${accent}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                  {preview}
                  <p className="mt-4 text-xs text-muted">{caption}</p>
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
                    <div className="inline-block rounded-full bg-accent-mint/15 px-3 py-1 text-xs font-bold text-accent-mint">Trilha de Habilidades</div>
                    <p className="mt-1 text-xs text-muted">Sempre grátis</p>
                  </th>
                  <th className="pb-4 text-center">
                    <div className="inline-block rounded-full bg-accent-blue/15 px-3 py-1 text-xs font-bold text-accent-blue">Trilha por IA</div>
                    <p className="mt-1 text-xs text-muted">Assinatura</p>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {COMPARE_ROWS.map(({ feature, free, ai }) => (
                  <tr key={feature}>
                    <td className="py-4 font-semibold text-foreground">{feature}</td>
                    <td className="py-4 text-center text-muted">{free}</td>
                    <td className="py-4 text-center text-accent-blue">{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-hover">
              Comece pela trilha grátis — sem compromisso <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── 6. Confiança ─────────────────────────────────────── */}
        <section className="border-t border-border/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-6 py-10">
            {TRUST_ITEMS.map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted">
                <span className="text-muted">{icon}</span>
                <span>{label}</span>
                <span className="text-muted">·</span>
                <span className="text-muted text-xs">{sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. CTA final ─────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-28 text-center">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-accent-blue opacity-70" />
          <h2 className="text-3xl font-black text-foreground md:text-5xl">
            Sua próxima etapa de carreira começa com uma pergunta,{" "}
            <span className="text-accent-blue">não com uma mensalidade.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Crie sua conta em segundos e comece a trilha hoje.
          </p>
          <Link href={ctaHref} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-white hover:bg-accent-hover">
            Começar agora, de graça <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted">Sem cartão de crédito. Sem contrato.</p>
        </section>
      </main>

      {/* ── 8. Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted">
          <span className="font-black tracking-tight text-accent-blue">CarrerAdemy</span>
          <nav className="flex flex-wrap gap-4">
            <Link href="#" className="hover:text-foreground">Sobre</Link>
            <Link href="#" className="hover:text-foreground">Contato</Link>
            <Link href="#" className="hover:text-foreground">Termos de uso</Link>
            <Link href="#" className="hover:text-foreground">Privacidade</Link>
          </nav>
          <span>© {new Date().getFullYear()} CarrerAdemy</span>
        </div>
      </footer>
    </div>
  );
}
