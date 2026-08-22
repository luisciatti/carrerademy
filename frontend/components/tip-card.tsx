"use client";

import { Lightbulb } from "lucide-react";

type TipCardProps = {
    pathTitle: string;
};

// Static tips indexed by career type keyword
const TIPS: Record<string, { title: string; body: string }> = {
    tech: {
        title: "Dica para Tecnologia",
        body: "Comunicação clara com produto e negócio é o que separa engenheiros bons de engenheiros excepcionais. Cada etapa desta trilha treina esse músculo.",
    },
    design: {
        title: "Dica para Design",
        body: "Defender decisões com dados e abertura é uma habilidade rara. Pratique aqui antes de usar nas reuniões de crítica que importam.",
    },
    marketing: {
        title: "Dica para Marketing",
        body: "A maior causa de retrabalho em marketing é handoff mal feito. Esta trilha te ajuda a criar rituais de alinhamento que evitam isso.",
    },
    sales: {
        title: "Dica para Vendas",
        body: "Discovery consultivo gera conversas maiores e mais ricas. Treine perguntas abertas aqui antes de usar com clientes reais.",
    },
    finance: {
        title: "Dica para Finanças",
        body: "Análises que não geram ação estão incompletas. Esta trilha transforma dado em recomendação com clareza executiva.",
    },
    operations: {
        title: "Dica para Operações",
        body: "Fluidez operacional começa com prioridade compartilhada. Cada atividade aqui vai te ajudar a operar com menos urgência artificial.",
    },
    other: {
        title: "Dica de Soft Skills",
        body: "As pessoas que mais crescem na carreira dominam escuta ativa e comunicação clara. Esta trilha pratica exatamente isso.",
    },
};

function inferCareerKey(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("tecnologia") || t.includes("tech")) return "tech";
    if (t.includes("design")) return "design";
    if (t.includes("marketing")) return "marketing";
    if (t.includes("venda") || t.includes("sales")) return "sales";
    if (t.includes("finan")) return "finance";
    if (t.includes("opera")) return "operations";
    return "other";
}

export function TipCard({ pathTitle }: TipCardProps) {
    const key = inferCareerKey(pathTitle);
    const tip = TIPS[key] ?? TIPS.other;

    return (
        <aside className="flex items-start gap-3 rounded-2xl border border-accent-coral/35 bg-accent-coral/8 px-4 py-3">
            <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-coral" />
            <div>
                <p className="text-xs font-semibold text-accent-coral">{tip.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{tip.body}</p>
            </div>
        </aside>
    );
}
