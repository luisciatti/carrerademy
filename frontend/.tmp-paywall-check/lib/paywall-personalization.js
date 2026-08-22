"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonalizedHeadline = getPersonalizedHeadline;
exports.getStatementAnchor = getStatementAnchor;
exports.getPersonalizedBullets = getPersonalizedBullets;
exports.getLockedStepContext = getLockedStepContext;
exports.getUnlockCopy = getUnlockCopy;
const GOAL_TEXT = {
    GROW_CURRENT_JOB: "crescer no seu momento atual",
    SWITCH_JOB: "trocar de emprego",
    FIND_JOB_ABROAD: "buscar uma vaga fora do pais",
    MOVE_ABROAD: "planejar sua mudanca para fora do pais",
};
const CAREER_TYPE_TEXT = {
    TECH: "tecnologia",
    DESIGN: "design",
    MARKETING: "marketing",
    SALES: "vendas",
    FINANCE: "financas",
    OPERATIONS: "operacoes",
    OTHER: "carreira",
};
function getPersonalizedHeadline(context) {
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
function getStatementAnchor(context) {
    if (!context?.identity_statement) {
        return "Baseado no que voce ja compartilhou no onboarding, aqui esta o que vem a seguir.";
    }
    const compact = context.identity_statement.trim().replace(/\s+/g, " ");
    const excerpt = compact.length > 150 ? `${compact.slice(0, 147).trimEnd()}...` : compact;
    return `Baseado em quem voce e hoje — ${excerpt} — aqui esta o que vem a seguir.`;
}
function getPersonalizedBullets(context) {
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
function getLockedStepContext(step) {
    const description = step.description.trim();
    if (description.length > 0) {
        return description.length > 120 ? `${description.slice(0, 117).trimEnd()}...` : description;
    }
    return `Um proximo bloco guiado para avancar em ${step.title.toLowerCase()}.`;
}
function getUnlockCopy(context) {
    if (!context) {
        return "Desbloqueia sua trilha personalizada completa + acesso a todas as trilhas futuras do catalogo.";
    }
    return `Desbloqueia sua trilha personalizada completa para ${context.dream_job ?? GOAL_TEXT[context.goal]} + acesso a todas as trilhas futuras do catalogo.`;
}
