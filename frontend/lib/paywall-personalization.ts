import type { CareerPathStep, CareerType, GoalType, OnboardingContextResponse } from "./types";

export type JobsTeaserCard = {
    role_title: string;
    company_label: string;
};

const GOAL_TEXT: Record<GoalType, string> = {
    GROW_CURRENT_JOB: "crescer no seu momento atual",
    SWITCH_JOB: "trocar de emprego",
    FIND_JOB_ABROAD: "buscar uma vaga fora do pais",
    MOVE_ABROAD: "planejar sua mudanca para fora do pais",
};

const CAREER_TYPE_TEXT: Record<CareerType, string> = {
    TECH: "tecnologia",
    DESIGN: "design",
    MARKETING: "marketing",
    SALES: "vendas",
    FINANCE: "financas",
    OPERATIONS: "operacoes",
    OTHER: "carreira",
};

const TEASER_ROLE_BY_CAREER: Record<CareerType, string[]> = {
    TECH: ["Desenvolvedor Backend", "Engenheiro de Software", "Analista de Dados"],
    DESIGN: ["Product Designer", "UX Designer", "Designer de Interface"],
    MARKETING: ["Analista de Marketing", "Especialista em Midia Paga", "Social Media Strategist"],
    SALES: ["Executivo de Contas", "Inside Sales", "Analista de Vendas"],
    FINANCE: ["Analista Financeiro", "Controlador Financeiro", "Especialista em FP&A"],
    OPERATIONS: ["Analista de Operacoes", "Coordenador de Processos", "Especialista em Logistica"],
    OTHER: ["Analista de Projetos", "Coordenador de Area", "Especialista de Negocio"],
};

const TEASER_COMPANY_BY_CAREER: Record<CareerType, string[]> = {
    TECH: ["Empresa de Tecnologia", "Plataforma SaaS", "Startup em crescimento"],
    DESIGN: ["Empresa de Produto Digital", "Estudio de Design", "Plataforma de Servicos"],
    MARKETING: ["Empresa de Tecnologia", "Scale-up de E-commerce", "Agencia de Performance"],
    SALES: ["Empresa B2B", "Plataforma de Servicos", "Empresa de Tecnologia"],
    FINANCE: ["Empresa de Servicos Financeiros", "Fintech em expansao", "Consultoria de Negocios"],
    OPERATIONS: ["Empresa de Logistica", "Operacao de Servicos", "Empresa de Tecnologia"],
    OTHER: ["Empresa em crescimento", "Operacao de Servicos", "Empresa de Tecnologia"],
};

const GOAL_LEVEL_HINT: Record<GoalType, [string, string, string]> = {
    GROW_CURRENT_JOB: ["Senior", "Pleno", "Especialista"],
    SWITCH_JOB: ["Pleno", "Junior", "Pleno"],
    FIND_JOB_ABROAD: ["Remoto", "Global", "Internacional"],
    MOVE_ABROAD: ["Global", "Remoto", "Internacional"],
};

function hasSeniorityHint(text: string): boolean {
    return /(junior|jr\.?|pleno|senior|s[eê]nior|especialista|lead|remoto|global|internacional)/i.test(text);
}

function withLevelHint(title: string, hint: string): string {
    if (hasSeniorityHint(title)) {
        return title;
    }
    return `${title} ${hint}`;
}

export function getJobsTeaserCards(context: OnboardingContextResponse | null): JobsTeaserCard[] {
    if (!context) {
        return [
            { role_title: "Especialista de Area Pleno", company_label: "Empresa de Tecnologia" },
            { role_title: "Analista de Projetos Senior", company_label: "Empresa em crescimento" },
            { role_title: "Coordenador de Operacoes", company_label: "Plataforma de Servicos" },
        ];
    }

    const roleTemplates = [...TEASER_ROLE_BY_CAREER[context.career_type]];
    const companyTemplates = [...TEASER_COMPANY_BY_CAREER[context.career_type]];
    const levelHints = GOAL_LEVEL_HINT[context.goal];

    if (context.dream_job && context.dream_job.trim().length > 0) {
        roleTemplates[0] = context.dream_job.trim();
    }

    return [0, 1, 2].map((index) => ({
        role_title: withLevelHint(roleTemplates[index] ?? roleTemplates[0], levelHints[index]),
        company_label: companyTemplates[index] ?? companyTemplates[0],
    }));
}

export function getPersonalizedHeadline(context: OnboardingContextResponse | null): string {
    if (!context) {
        return "Muito bem! Voce ja deu o primeiro passo rumo a sua proxima fase profissional.";
    }

    if (context.dream_job) {
        return `Muito bem! Voce ja deu o primeiro passo rumo a ${context.dream_job}.`;
    }

    if (context.goal === "GROW_CURRENT_JOB") {
        return `Muito bem! Voce ja deu o primeiro passo rumo a crescer em ${CAREER_TYPE_TEXT[context.career_type]}.`;
    }

    return `Muito bem! Voce ja deu o primeiro passo rumo a ${GOAL_TEXT[context.goal]}.`;
}

export function getStatementAnchor(context: OnboardingContextResponse | null): string {
    if (!context?.identity_statement) {
        return "Baseado no que voce ja compartilhou no onboarding, aqui esta o que vem a seguir.";
    }

    const compact = context.identity_statement.trim().replace(/\s+/g, " ");
    const excerpt = compact.length > 150 ? `${compact.slice(0, 147).trimEnd()}...` : compact;
    return `Baseado em quem voce e hoje — ${excerpt} — aqui esta o que vem a seguir.`;
}

export function getPersonalizedBullets(context: OnboardingContextResponse | null): string[] {
    if (!context) {
        return [
            "Uma trilha focada no seu proximo objetivo profissional.",
            "Conteudo adaptado ao tipo de carreira que voce esta construindo.",
            "Sequencia pensada para caber no seu ritmo semanal.",
        ];
    }

    return [
        `Uma trilha focada em ${context.dream_job ?? GOAL_TEXT[context.goal]}.`,
        `Conteudo adaptado pra quem trabalha com ${CAREER_TYPE_TEXT[context.career_type]}.`,
        `Sequencia pensada pro seu ritmo - ${context.weekly_time_availability}h por semana disponiveis.`,
    ];
}

export function getLockedStepContext(step: CareerPathStep): string {
    const description = step.description.trim();
    if (description.length > 0) {
        return description.length > 120 ? `${description.slice(0, 117).trimEnd()}...` : description;
    }

    return `Um proximo bloco guiado para avancar em ${step.title.toLowerCase()}.`;
}

export function getUnlockCopy(context: OnboardingContextResponse | null): string {
    if (!context) {
        return "Desbloqueia sua trilha personalizada completa + acesso a todas as trilhas futuras do catalogo.";
    }

    return `Desbloqueia sua trilha personalizada completa para ${context.dream_job ?? GOAL_TEXT[context.goal]} + acesso a todas as trilhas futuras do catalogo.`;
}
