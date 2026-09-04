// 7-Step Deterministic Convergence Engine for Timely Compass

import {
  BeliefState,
  ConversationState,
  AllowedAction,
  ExplorationSession,
} from './types';
import { detectPauseOrExitIntent, detectExplicitDistress } from './safetyLinter';

export interface ConvergenceDecision {
  nextState: ConversationState;
  action: AllowedAction;
  trigger: string;
  forceSynthesis: boolean;
  isInterrupt: boolean;
}

export function isResumeIntent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // If it's a pause or exit intent, it cannot be a resume intent
  if (detectPauseOrExitIntent(text)) return false;

  const lower = text.toLowerCase().trim();
  return /\b(i'?m back|let'?s continue|let us continue|ready to continue|ready to resume|let'?s resume|where were we|pick (?:this|it) back up|continue exploring|back now|ready to talk again|continue where we left off|back from my break|picked up where we left off)\b/i.test(
    lower
  );
}

export function isCrisisRecovery(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  return (
    !detectExplicitDistress(text) &&
    /\b(talked to (someone|a counselor|my doctor|my parents|a friend)|feeling (better|a bit better|calmer|okay now)|i am okay now|feel safer now|can we talk about career|ready to explore careers)\b/i.test(
      lower
    )
  );
}

export function evaluateConvergence(
  session: ExplorationSession,
  latestUserText: string,
  modelSafetySignals?: {
    distress_detected?: boolean;
    younger_user_explicit_disclosure?: boolean;
    stop_or_pause_requested?: boolean;
  }
): ConvergenceDecision {
  const { turnCount, hardCeiling, beliefState, overrides } = session;
  const userLower = (latestUserText || '').toLowerCase().trim();

  // 1. Distress Override (Highest Priority)
  const isDistressNow = detectExplicitDistress(latestUserText) || modelSafetySignals?.distress_detected;
  if (isDistressNow) {
    return {
      nextState: session.state,
      action: 'PAUSE',
      trigger: 'DISTRESS_OVERRIDE',
      forceSynthesis: false,
      isInterrupt: true,
    };
  }

  // Check for crisis recovery
  if (overrides.distress) {
    if (isCrisisRecovery(latestUserText)) {
      console.log('[ENGINE] User safely recovered from distress state.');
      overrides.distress = false;
    } else {
      return {
        nextState: session.state,
        action: 'PAUSE',
        trigger: 'DISTRESS_OVERRIDE',
        forceSynthesis: false,
        isInterrupt: true,
      };
    }
  }

  // 2. Resume Intent Check (Clear pause override if user returns)
  if (overrides.stop_requested && isResumeIntent(latestUserText)) {
    console.log('[ENGINE] User resumed after pause.');
    overrides.stop_requested = false;
  }

  // 3. Pause / Leave Request (MUST NOT trigger synthesis, bookmark & pause)
  if (detectPauseOrExitIntent(latestUserText) || overrides.stop_requested) {
    return {
      nextState: session.state,
      action: 'PAUSE',
      trigger: 'PAUSE_REQUEST',
      forceSynthesis: false,
      isInterrupt: true,
    };
  }

  // 4. User Explicit Wrap Up / End Session Request
  const explicitWrapUp = /\b(wrap up now|that's all for today|can we finish|end this conversation|wrap this up)\b/i.test(
    userLower
  );
  if (explicitWrapUp) {
    if (turnCount >= 3) {
      return {
        nextState: 'CONTINUE/END',
        action: 'SYNTHESIZE',
        trigger: 'STOP_REQUEST',
        forceSynthesis: true,
        isInterrupt: true,
      };
    } else {
      return {
        nextState: session.state,
        action: 'PAUSE',
        trigger: 'EARLY_STOP_PAUSE',
        forceSynthesis: false,
        isInterrupt: true,
      };
    }
  }

  // 5. Hard Ceiling Gate
  if (turnCount >= hardCeiling) {
    return {
      nextState: 'SYNTHESIZING',
      action: 'SYNTHESIZE',
      trigger: 'HARD_CEILING_REACHED',
      forceSynthesis: true,
      isInterrupt: false,
    };
  }

  // 6. Contradiction Gate (Check for high-severity unresolved contradictions)
  const unresolvedHighContradictions = Array.isArray(beliefState.contradictions)
    ? beliefState.contradictions.filter((c) => c && c.status === 'unresolved' && c.severity === 'high')
    : [];

  // If in NARROWING_CHECKING or attempting to synthesize while heavy contradictions exist, force clarification
  if (session.state === 'NARROWING_CHECKING' && unresolvedHighContradictions.length > 0) {
    return {
      nextState: 'NARROWING_CHECKING',
      action: 'ASK',
      trigger: 'UNRESOLVED_CONTRADICTION_GATE',
      forceSynthesis: false,
      isInterrupt: false,
    };
  }

  // 7. Momentum Check (User explicitly asks for summary, synthesis, or roadmap)
  const wantsSynthesis = /\b(summarize|what are my options|give me the summary|what should i explore|give me directions|what did we find|synthesize|can you summarize|roadmap|give me next steps)\b/i.test(
    userLower
  );
  if (wantsSynthesis && turnCount >= 3) {
    return {
      nextState: 'SYNTHESIZING',
      action: 'SYNTHESIZE',
      trigger: 'USER_MOMENTUM_SYNTHESIS_REQUEST',
      forceSynthesis: true,
      isInterrupt: false,
    };
  }

  // Opening 2-turn Cap
  if (session.state === 'OPENING') {
    if (turnCount >= 2) {
      return {
        nextState: 'EXPLORING',
        action: 'ASK',
        trigger: 'OPENING_2_TURN_CAP',
        forceSynthesis: false,
        isInterrupt: false,
      };
    }
    return {
      nextState: 'OPENING',
      action: 'ASK',
      trigger: 'OPENING_IN_PROGRESS',
      forceSynthesis: false,
      isInterrupt: false,
    };
  }

  // Evidence and Confirmation Quality Check
  const activeInterests = Array.isArray(beliefState.interests)
    ? beliefState.interests.filter((i) => i && i.active !== false)
    : [];
  const hasUserStatedInterests = activeInterests.some(
    (i) => i.status === 'user-stated' || i.status === 'user-confirmed'
  );
  const hasUserStatedEnjoymentOrGoals =
    (Array.isArray(beliefState.enjoyment) && beliefState.enjoyment.some((e) => e && (e.status === 'user-stated' || e.status === 'user-confirmed'))) ||
    (Array.isArray(beliefState.goals) && beliefState.goals.some((g) => g && (g.status === 'user-stated' || g.status === 'user-confirmed')));
  const hasConstraintsOrLifestyle =
    (Array.isArray(beliefState.constraints) && beliefState.constraints.length > 0) ||
    (Array.isArray(beliefState.lifestyle_fit) && beliefState.lifestyle_fit.length > 0);

  // Check if user is expressing unresolved uncertainty, ambiguity, or wanting to test further
  const expressesUncertainty =
    /\b(not sure|unsure|maybe|i don't know|don't know|no idea|confused|torn|either|or maybe|not really|actually|i think so but|hard to tell)\b/i.test(
      userLower
    );

  // Check for user affirmation / confirmation of an emerging pattern
  const userAffirmedPattern =
    /\b(yes|exactly|that resonates|that sounds like me|that fits|that makes sense|definitely|i agree|you nailed it|spot on|that's right|yeah)\b/i.test(
      userLower
    );

  // Check for user wanting experimentation
  const wantsExperimentation =
    /\b(experiment|try something|small project|mini-project|test this|low-risk|try it out|taste of it|shadow|hands-on)\b/i.test(
      userLower
    );

  if (session.state === 'EXPLORING') {
    // Only transition into NARROWING_CHECKING if meaningful user-stated patterns exist AND no high contradictions
    const candidatePatternsReady =
      hasUserStatedInterests &&
      hasUserStatedEnjoymentOrGoals &&
      hasConstraintsOrLifestyle &&
      turnCount >= 4 &&
      !expressesUncertainty;

    if (candidatePatternsReady && unresolvedHighContradictions.length === 0) {
      return {
        nextState: 'NARROWING_CHECKING',
        action: 'ASK',
        trigger: 'CANDIDATE_PATTERNS_READY_FOR_CHECKING',
        forceSynthesis: false,
        isInterrupt: false,
      };
    }

    return {
      nextState: 'EXPLORING',
      action: 'ASK',
      trigger: 'EXPLORING_CONTINUE',
      forceSynthesis: false,
      isInterrupt: false,
    };
  }

  if (session.state === 'NARROWING_CHECKING') {
    // If user expressed uncertainty, disagreement, or new hypotheses, return to EXPLORING
    if (expressesUncertainty && !userAffirmedPattern) {
      return {
        nextState: 'EXPLORING',
        action: 'ASK',
        trigger: 'USER_UNCERTAINTY_CONTINUE_EXPLORING',
        forceSynthesis: false,
        isInterrupt: false,
      };
    }

    // Only transition to SYNTHESIZING if user confirmed the checked patterns, or explicitly requested next steps, or confirmed experimentation goals
    if (userAffirmedPattern || wantsSynthesis || (wantsExperimentation && turnCount >= 5)) {
      return {
        nextState: 'SYNTHESIZING',
        action: 'SYNTHESIZE',
        trigger: 'CHECKED_ALIGNMENT_CONFIRMED_SYNTHESIZE',
        forceSynthesis: true,
        isInterrupt: false,
      };
    }

    // Continue checking and refining assumptions in NARROWING_CHECKING
    return {
      nextState: 'NARROWING_CHECKING',
      action: 'ASK',
      trigger: 'NARROWING_CONTINUE_CHECKING',
      forceSynthesis: false,
      isInterrupt: false,
    };
  }

  if (session.state === 'SYNTHESIZING') {
    return {
      nextState: 'CONTINUE/END',
      action: 'INFORM',
      trigger: 'POST_SYNTHESIS_FOLLOW_UP',
      forceSynthesis: false,
      isInterrupt: false,
    };
  }

  // Default Continue
  return {
    nextState: session.state,
    action: 'ASK',
    trigger: 'DEFAULT_CONTINUE',
    forceSynthesis: false,
    isInterrupt: false,
  };
}

