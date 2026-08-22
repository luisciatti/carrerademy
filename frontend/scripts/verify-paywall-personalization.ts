import assert from "node:assert/strict";

import {
    getPersonalizedBullets,
    getPersonalizedHeadline,
    getStatementAnchor,
    getUnlockCopy,
} from "../lib/paywall-personalization";
import type { OnboardingContextResponse, PaywallTeaserResponse } from "../lib/types";

const userA: OnboardingContextResponse = {
    onboarding_response_id: "11111111-1111-1111-1111-111111111111",
    current_job: "Analista de suporte",
    dream_job: "Cloud Engineer",
    career_type: "TECH",
    goal: "SWITCH_JOB",
    weekly_time_availability: 5,
    identity_statement: "Voce esta saindo do suporte com foco em construir uma migracao pratica para cloud, no seu ritmo semanal.",
};

const userB: OnboardingContextResponse = {
    onboarding_response_id: "22222222-2222-2222-2222-222222222222",
    current_job: "Assistente de marketing",
    dream_job: null,
    career_type: "MARKETING",
    goal: "GROW_CURRENT_JOB",
    weekly_time_availability: 10,
    identity_statement: "Voce ja tem base em marketing e agora quer ganhar mais autonomia e impacto no cargo atual com constancia.",
};

const teaserA: PaywallTeaserResponse = {
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

const teaserB: PaywallTeaserResponse = {
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

const headlineA = getPersonalizedHeadline(userA);
const headlineB = getPersonalizedHeadline(userB);
const bulletsA = getPersonalizedBullets(userA).join(" | ");
const bulletsB = getPersonalizedBullets(userB).join(" | ");
const anchorA = getStatementAnchor(userA);
const anchorB = getStatementAnchor(userB);
const unlockA = getUnlockCopy(userA);
const unlockB = getUnlockCopy(userB);

assert.notEqual(headlineA, headlineB);
assert.notEqual(bulletsA, bulletsB);
assert.notEqual(anchorA, anchorB);
assert.notEqual(unlockA, unlockB);
assert.notEqual(teaserA.salary_benchmark?.masked_salary_range, teaserB.salary_benchmark?.masked_salary_range);
assert.notEqual(teaserA.live_jobs.search_url, teaserB.live_jobs.search_url);
assert.ok(teaserA.salary_benchmark?.masked_salary_range.includes("█"));
assert.ok(teaserB.salary_benchmark?.masked_salary_range.includes("█"));
assert.ok(teaserA.live_jobs.search_url.startsWith("https://www.linkedin.com/jobs/search/"));
assert.ok(teaserB.live_jobs.search_url.startsWith("https://www.linkedin.com/jobs/search/"));

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
