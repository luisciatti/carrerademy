export type ApiPathStepStatus = "LOCKED" | "UNLOCKED" | "COMPLETED";
export type ApiCareerPathStatus = "GENERATING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type GoalType =
    | "GROW_CURRENT_JOB"
    | "SWITCH_JOB"
    | "FIND_JOB_ABROAD"
    | "MOVE_ABROAD";

export type OnboardingPayload = {
    current_job: string;
    dream_job?: string | null;
    goal: GoalType;
    experience_level: string;
    weekly_time_availability: number;
};

export type OnboardingResponse = {
    career_path_id: string;
    status: string;
    message: string;
};

export type CareerPathStep = {
    id: string;
    order_index: number;
    title: string;
    description: string;
    status: ApiPathStepStatus;
    is_free: boolean;
    is_description_locked: boolean;
    content_type: string | null;
    external_url: string | null;
};

export type CareerPath = {
    id: string;
    title: string;
    status: ApiCareerPathStatus;
    generation_status: ApiCareerPathStatus;
    steps: CareerPathStep[];
};

export type CompleteStepResponse = {
    completed_step_id: string;
    completed: boolean;
    next_step_id: string | null;
    next_step_unlocked: boolean;
    next_step_blocked_by_paywall: boolean;
    user_free_step_used: boolean;
};

export type MeResponse = {
    id: string;
    clerk_user_id: string;
    email: string;
    name: string;
    free_step_used: boolean;
};
