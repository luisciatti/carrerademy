"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const paywall_personalization_1 = require("../lib/paywall-personalization");
const userA = {
    onboarding_response_id: "11111111-1111-1111-1111-111111111111",
    current_job: "Analista de suporte",
    dream_job: "Cloud Engineer",
    career_type: "TECH",
    goal: "SWITCH_JOB",
    weekly_time_availability: 5,
    identity_statement: "Voce esta saindo do suporte com foco em construir uma migracao pratica para cloud, no seu ritmo semanal.",
};
const userB = {
    onboarding_response_id: "22222222-2222-2222-2222-222222222222",
    current_job: "Assistente de marketing",
    dream_job: null,
    career_type: "MARKETING",
    goal: "GROW_CURRENT_JOB",
    weekly_time_availability: 10,
    identity_statement: "Voce ja tem base em marketing e agora quer ganhar mais autonomia e impacto no cargo atual com constancia.",
};
const teaserA = {
    onboarding_context: userA,
    salary_benchmark: {
        role_title: "Cloud Engineer",
        region: "Brasil",
        visible_salary_min: 24000,
        visible_salary_max_hint: "63.000",
        masked_salary_range: "R$ 24.000 - R$ ██.███/ano",
        source: "Talent.com",
        updated_at: "2026-08-20",
    },
    live_jobs: {
        provider: "LinkedIn Jobs",
        search_query: "Cloud Engineer",
        search_url: "https://www.linkedin.com/jobs/search/?keywords=Cloud+Engineer&location=Brasil",
    },
};
const teaserB = {
    onboarding_context: userB,
    salary_benchmark: {
        role_title: "Analista de Marketing",
        region: "Brasil",
        visible_salary_min: 19800,
        visible_salary_max_hint: "32.400",
        masked_salary_range: "R$ 19.800 - R$ ██.███/ano",
        source: "Talent.com",
        updated_at: "2026-08-20",
    },
    live_jobs: {
        provider: "LinkedIn Jobs",
        search_query: "Analista de Marketing",
        search_url: "https://www.linkedin.com/jobs/search/?keywords=Analista+de+Marketing&location=Brasil",
    },
};
const headlineA = (0, paywall_personalization_1.getPersonalizedHeadline)(userA);
const headlineB = (0, paywall_personalization_1.getPersonalizedHeadline)(userB);
const bulletsA = (0, paywall_personalization_1.getPersonalizedBullets)(userA).join(" | ");
const bulletsB = (0, paywall_personalization_1.getPersonalizedBullets)(userB).join(" | ");
const anchorA = (0, paywall_personalization_1.getStatementAnchor)(userA);
const anchorB = (0, paywall_personalization_1.getStatementAnchor)(userB);
const unlockA = (0, paywall_personalization_1.getUnlockCopy)(userA);
const unlockB = (0, paywall_personalization_1.getUnlockCopy)(userB);
strict_1.default.notEqual(headlineA, headlineB);
strict_1.default.notEqual(bulletsA, bulletsB);
strict_1.default.notEqual(anchorA, anchorB);
strict_1.default.notEqual(unlockA, unlockB);
strict_1.default.notEqual(teaserA.salary_benchmark?.masked_salary_range, teaserB.salary_benchmark?.masked_salary_range);
strict_1.default.notEqual(teaserA.live_jobs.search_url, teaserB.live_jobs.search_url);
strict_1.default.ok(teaserA.salary_benchmark?.masked_salary_range.includes("█"));
strict_1.default.ok(teaserB.salary_benchmark?.masked_salary_range.includes("█"));
strict_1.default.ok(teaserA.live_jobs.search_url.startsWith("https://www.linkedin.com/jobs/search/"));
strict_1.default.ok(teaserB.live_jobs.search_url.startsWith("https://www.linkedin.com/jobs/search/"));
console.log("headlineA:", headlineA);
console.log("headlineB:", headlineB);
console.log("bulletsA:", bulletsA);
console.log("bulletsB:", bulletsB);
console.log("anchorA:", anchorA);
console.log("anchorB:", anchorB);
console.log("unlockA:", unlockA);
console.log("unlockB:", unlockB);
console.log("salaryRangeA:", teaserA.salary_benchmark?.masked_salary_range);
console.log("salaryRangeB:", teaserB.salary_benchmark?.masked_salary_range);
console.log("jobsA:", teaserA.live_jobs.search_url);
console.log("jobsB:", teaserB.live_jobs.search_url);
console.log("paywall-personalization: ok");
