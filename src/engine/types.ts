// V1 Frozen Architecture Types for Timely Compass

export type ConfidenceLevel = 'unknown' | 'tentative' | 'moderate' | 'strong';
export type BeliefStatus = 'inferred' | 'user-stated' | 'user-confirmed';
export type IndecisionType = 'readiness' | 'information' | 'inconsistency' | 'none';
export type DirectionalImpact = 'high' | 'medium' | 'low';
export type MotivationSource = 'intrinsic' | 'extrinsic_financial' | 'extrinsic_social' | 'unclear';
export type ConstraintType = 'financial' | 'geographic' | 'academic' | 'temporal' | 'health' | 'other';
export type ConstraintFlexibility = 'rigid' | 'flexible' | 'unclear';
export type LifeStage = 'middle_school' | 'high_school' | 'college' | 'career_changer' | 'unspecified';

export type ConversationState =
  | 'OPENING'
  | 'EXPLORING'
  | 'NARROWING_CHECKING'
  | 'SYNTHESIZING'
  | 'CONTINUE/END';

export type AllowedAction =
  | 'ASK'
  | 'INFORM'
  | 'SYNTHESIZE'
  | 'PAUSE'
  | 'REFLECT_ONLY';

// 18-Field Frozen Belief State
export interface BeliefItem<T = string> {
  id: string;
  value: T;
  confidence: ConfidenceLevel;
  status: BeliefStatus;
  confirmation_needed: boolean;
  notes?: string;
  active?: boolean;
}

export interface GoalItem {
  id: string;
  goal: string;
  timeframe?: string;
  motivation_source: MotivationSource;
  confidence: ConfidenceLevel;
  status: BeliefStatus;
  confirmation_needed: boolean;
}

export interface ConstraintItem {
  id: string;
  type: ConstraintType;
  description: string;
  flexibility: ConstraintFlexibility;
  confidence: ConfidenceLevel;
  status: BeliefStatus;
  confirmation_needed: boolean;
}

export interface ContradictionItem {
  id: string;
  pole_a: string;
  pole_b: string;
  status: 'unresolved' | 'acknowledged' | 'reconciled';
  severity: 'high' | 'low';
}

export interface FamilyContext {
  perception_only: true; // Hardcoded requirement
  description: string;
  influence_level: 'high' | 'moderate' | 'low' | 'unclear';
  alignment: 'aligned' | 'tension' | 'unclear';
  confidence: ConfidenceLevel;
  status: BeliefStatus;
}

export interface BeliefState {
  interests: BeliefItem[];
  dislikes_boundaries: BeliefItem[];
  skill_level: BeliefItem<{ skill: string; level: string }>[];
  self_efficacy: BeliefItem<{ domain: string; level: string }>[];
  enjoyment: BeliefItem<{ activity: string; source: string }>[];
  lifestyle_fit: BeliefItem<{ preference: string; priority: string }>[];
  goals: GoalItem[];
  constraints: ConstraintItem[];
  contextual_supports: BeliefItem<{ source: string; description: string }>[];
  contextual_barriers: BeliefItem<{ barrier: string; severity: string }>[];
  outcome_expectations: BeliefItem<{ expectation: string; alignment: string }>[];
  exploration_level: {
    value: 'unexplored' | 'early' | 'active' | 'deep';
    confidence: ConfidenceLevel;
    status: BeliefStatus;
  };
  commitment_level: {
    value: 'uncommitted' | 'considering' | 'tentative' | 'decided';
    confidence: ConfidenceLevel;
    status: BeliefStatus;
  };
  situation: {
    current_stage: LifeStage;
    details: string;
    confidence: ConfidenceLevel;
    status: BeliefStatus;
  };
  family_context: FamilyContext;
  indecision_type: {
    type: IndecisionType;
    confidence: ConfidenceLevel;
    rationale: string;
  };
  open_threads: string[];
  contradictions: ContradictionItem[];
}

export interface CandidateQuestion {
  target_field: string;
  target_category: string;
  directional_impact: DirectionalImpact;
  rationale: string;
  question: string;
}

export interface SynthesisPayload {
  pattern_reflection: string;
  exploration_directions: Array<{
    title: string;
    why_it_fits: string;
    tensions_or_tradeoffs: string;
    next_experiment: string;
  }>;
  explicit_unknowns: string[];
  questions_for_real_people?: string[];
  agency_preserving_close: string;
}

// Structured Output proposed by Gemini
export interface GeminiTurnOutput {
  reflection?: string;
  detected_indecision?: {
    type: IndecisionType;
    confidence: ConfidenceLevel;
    rationale: string;
  };
  belief_updates?: {
    interests_to_add?: Array<{ value: string; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' }>;
    dislikes_to_add?: Array<{ value: string; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' }>;
    goals_to_add?: Array<{ goal: string; motivation_source: MotivationSource; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' }>;
    constraints_to_add?: Array<{ type: ConstraintType; description: string; flexibility: ConstraintFlexibility; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' }>;
    enjoyment_to_add?: Array<{ activity: string; source: string; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' }>;
    lifestyle_to_add?: Array<{ preference: string; priority: string; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' }>;
    open_threads_to_add?: string[];
    open_threads_to_resolve?: string[];
    contradictions_detected?: Array<{ pole_a: string; pole_b: string; severity: 'high' | 'low' }>;
    situation_update?: { current_stage: LifeStage; details: string; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' };
    family_context_update?: { description: string; influence_level: 'high' | 'moderate' | 'low' | 'unclear'; alignment: 'aligned' | 'tension' | 'unclear'; confidence: ConfidenceLevel; status: 'inferred' | 'user-stated' };
  };
  candidate_questions?: CandidateQuestion[];
  suggested_follow_ups?: string[];
  safety_signals?: {
    distress_detected: boolean;
    distress_rationale?: string;
    younger_user_explicit_disclosure: boolean;
    stop_or_pause_requested: boolean;
  };
  proposed_action?: AllowedAction;
  proposed_state?: ConversationState;
  inform_content?: string;
  synthesis_draft?: SynthesisPayload;
}

// Session state maintained in memory
export interface ExplorationSession {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  state: ConversationState;
  turnCount: number;
  hardCeiling: number;
  extensionBudgetUsed: number;
  overrides: {
    distress: boolean;
    younger_user: boolean;
    stop_requested: boolean;
  };
  beliefState: BeliefState;
  history: Array<{
    turn: number;
    sender: 'user' | 'compass';
    text: string;
    action?: AllowedAction;
    concept?: string;
    timestamp: number;
  }>;
}

// Engine Turn Result returned to UI
export interface EngineTurnResult {
  sessionId: string;
  turn: number;
  state: ConversationState;
  action: AllowedAction;
  replyText: string;
  reflection?: string;
  question?: string;
  informContent?: string;
  synthesis?: SynthesisPayload;
  conceptOrientation: 'Interests' | 'Goals' | 'Possibilities' | 'Constraints' | 'Motivation';
  suggestedFollowUps: string[];
  activeThreads: string[];
  unresolvedContradictionsCount: number;
  debugSnapshot?: {
    indecisionType: IndecisionType;
    interestsCount: number;
    goalsCount: number;
    constraintsCount: number;
  };
}
