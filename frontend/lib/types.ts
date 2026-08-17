export type ApiPathStepStatus = "LOCKED" | "UNLOCKED" | "COMPLETED";
export type ApiCareerPathStatus = "GENERATING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type ApiContentType = "COURSE" | "CERTIFICATION" | "ARTICLE" | "ACTION_TASK" | "VIDEO" | "QUIZ" | "DIAGRAM" | "INTERACTIVE_FORM" | "SCENARIO_BUILDER" | "RULES_RADIAL" | "MATCHING_GAME" | "DIALOGUE_SIMULATOR";
export type CareerPathKind = "STANDARD_SOFT_SKILLS" | "AI_PERSONALIZED";
export type CareerType = "TECH" | "DESIGN" | "MARKETING" | "SALES" | "FINANCE" | "OPERATIONS" | "OTHER";

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
    standard_career_path_id: string;
    ai_career_path_id: string;
    standard_status: string;
    ai_status: string;
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
};

export type CareerPath = {
    id: string;
    title: string;
    kind: CareerPathKind;
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
};
