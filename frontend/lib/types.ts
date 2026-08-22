export type ApiPathStepStatus = "LOCKED" | "UNLOCKED" | "COMPLETED";
export type ApiCareerPathStatus = "GENERATING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type ApiContentType = "COURSE" | "CERTIFICATION" | "ARTICLE" | "ACTION_TASK" | "VIDEO" | "QUIZ" | "DIAGRAM" | "INTERACTIVE_FORM" | "SCENARIO_BUILDER" | "RULES_RADIAL" | "MATCHING_GAME" | "DIALOGUE_SIMULATOR";
export type CareerPathKind = "STANDARD_SOFT_SKILLS" | "AI_PERSONALIZED";
export type CareerType = "TECH" | "DESIGN" | "MARKETING" | "SALES" | "FINANCE" | "OPERATIONS" | "OTHER";

export type Note = {
    id: string;
    path_step_id: string | null;
    step_title: string | null;
    title: string | null;
    content: string;
    created_at: string;
    updated_at: string;
};

export type QuizQuestion = {
    prompt: string;
    options: string[];
    correctIndex: number;
};

export type QuizSchema = {
    questions: QuizQuestion[];
};

export type FormFieldSchema = {
    name: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
};

export type FormSchema = {
    fields: FormFieldSchema[];
};

export type ScenarioBuilderPiece = {
    id: string;
    label: string;
    category?: string;
};

export type ScenarioBuilderSchema = {
    mode: "order" | "categorize";
    prompt: string;
    pieces: ScenarioBuilderPiece[];
    categories?: string[];
    correctOrder?: string[];
    correctCategories?: Record<string, string>;
    explanation: string;
};

export type RulesRadialSchema = {
    centerTitle: string;
    rules: Array<{
        id: string;
        title: string;
        description: string;
    }>;
};

export type MatchingSchema = {
    prompt: string;
    pairs: Array<{
        left: string;
        right: string;
    }>;
    successMessage?: string;
    errorMessage?: string;
};

export type DialogueOutcome = {
    title: string;
    evaluation: string;
};

export type DialogueOption = {
    id: string;
    label: string;
    nextNodeId?: string;
    outcome?: DialogueOutcome;
};

export type DialogueNode = {
    id: string;
    speaker: string;
    text: string;
    options: DialogueOption[];
};

export type DialogueSchema = {
    title: string;
    startNodeId: string;
    nodes: DialogueNode[];
};

export type ContentChainItem = {
    id: string;
    title: string;
    description: string;
    content_type: ApiContentType;
    external_url: string | null;
    video_url: string | null;
    quiz_schema: QuizSchema | null;
    diagram_url: string | null;
    form_schema: FormSchema | null;
    scenario_schema: ScenarioBuilderSchema | null;
    rules_schema: RulesRadialSchema | null;
    matching_schema: MatchingSchema | null;
    dialogue_schema: DialogueSchema | null;
    follow_up_content_item_id: string | null;
    reward_description: string | null;
};

export type GoalType =
    | "GROW_CURRENT_JOB"
    | "SWITCH_JOB"
    | "FIND_JOB_ABROAD"
    | "MOVE_ABROAD";

export type OnboardingPayload = {
    current_job: string;
    dream_job?: string | null;
    career_type: CareerType;
    goal: GoalType;
    experience_level: string;
    weekly_time_availability: number;
};

export type OnboardingResponse = {
    onboarding_response_id: string;
    standard_career_path_id: string;
    ai_career_path_id: string;
    standard_status: string;
    ai_status: string;
    identity_statement: string;
    identity_statement_generated_at: string | null;
    message: string;
};

export type OnboardingDraftResponse = {
    onboarding_response_id: string;
    identity_statement: string;
    identity_statement_generated_at: string | null;
};

export type OnboardingExploreResponse = {
    onboarding_response_id: string;
    standard_career_path_id: string;
    ai_career_path_id: string;
    standard_status: string;
    ai_status: string;
    message: string;
};

export type OnboardingContextResponse = {
    onboarding_response_id: string;
    career_type: CareerType;
    goal: GoalType;
    current_job: string;
    dream_job: string | null;
    weekly_time_availability: number;
    identity_statement: string;
};

export type SalaryBenchmarkTeaser = {
    role_title: string;
    region: string;
    visible_salary_min: number;
    visible_salary_max_hint: string;
    masked_salary_range: string;
    source: string;
    updated_at: string;
};

export type LiveJobsTeaser = {
    provider: string;
    search_query: string;
    search_url: string;
};

export type PaywallTeaserResponse = {
    onboarding_context: OnboardingContextResponse;
    salary_benchmark: SalaryBenchmarkTeaser | null;
    live_jobs: LiveJobsTeaser;
};

export type IdentityStatementResponse = {
    onboarding_response_id: string;
    identity_statement: string;
    identity_statement_generated_at: string | null;
};

export type CareerPathStep = {
    id: string;
    order_index: number;
    title: string;
    description: string;
    status: ApiPathStepStatus;
    is_free: boolean;
    is_description_locked: boolean;
    content_item_id: string | null;
    current_content_item_id: string | null;
    chain_total_stages: number;
    content_type: ApiContentType | null;
    external_url: string | null;
    video_url: string | null;
    quiz_schema: QuizSchema | null;
    diagram_url: string | null;
    form_schema: FormSchema | null;
    scenario_schema: ScenarioBuilderSchema | null;
    rules_schema: RulesRadialSchema | null;
    matching_schema: MatchingSchema | null;
    dialogue_schema: DialogueSchema | null;
    follow_up_content_item_id: string | null;
    chain_items: ContentChainItem[];
    reward_description: string | null;
};

export type CareerPath = {
    id: string;
    title: string;
    kind: CareerPathKind;
    status: ApiCareerPathStatus;
    generation_status: ApiCareerPathStatus;
    steps: CareerPathStep[];
};

export type TrailTemplate = {
    id: string;
    title: string;
    description: string;
    category: string;
    career_type_tags: string[];
    icon: string;
    is_starter: boolean;
    already_added: boolean;
};

export type AddedTrailTemplateResponse = {
    career_path_id: string;
    title: string;
    kind: CareerPathKind;
    status: ApiCareerPathStatus;
};

export type CompleteStepResponse = {
    completed_step_id: string;
    completed: boolean;
    next_step_id: string | null;
    next_step_unlocked: boolean;
    next_step_blocked_by_paywall: boolean;
    user_free_step_used: boolean;
    current_content_item_id: string | null;
    next_content_item_id: string | null;
    chain_position: number | null;
    chain_total: number | null;
};

export type MeResponse = {
    id: string;
    clerk_user_id: string;
    email: string;
    name: string;
    free_step_used: boolean;
    has_active_subscription: boolean;
    current_streak: number;
    longest_streak: number;
};

export type DailyObjective = {
    id: string;
    objective_type: "PATH_STEP" | "REVIEW" | "BONUS";
    title: string;
    description: string;
    content_type: ApiContentType | null;
    estimated_minutes: number;
    reference_id: string | null;
    step_id: string | null;
    is_locked: boolean;
    is_completed_today: boolean;
};

export type DailySessionResponse = {
    today: string;
    current_streak: number;
    longest_streak: number;
    objectives: DailyObjective[];
};

export type Achievement = {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlocked_at?: string | null;
};

export type ProfilePathSummary = {
    id: string;
    title: string;
    kind: CareerPathKind;
    status: string;
    steps_total: number;
    steps_completed: number;
};

export type ProfileResponse = {
    user: {
        id: string;
        name: string;
        email: string;
        current_streak: number;
        longest_streak: number;
    };
    stats: {
        steps_completed: number;
        points_this_month: number;
        best_streak: number;
        paths_completed: number;
    };
    achievements: Achievement[];
    paths: ProfilePathSummary[];
};

export type LeaderboardEntry = {
    rank: number;
    name: string;
    points: number;
};
