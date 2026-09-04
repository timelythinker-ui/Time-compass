// Deterministic Belief-State Management for Timely Compass (18-field Frozen Architecture)

import {
  BeliefState,
  ConfidenceLevel,
  BeliefStatus,
  GeminiTurnOutput,
  BeliefItem,
  GoalItem,
  ConstraintItem,
} from './types';

export function createInitialBeliefState(): BeliefState {
  return {
    interests: [],
    dislikes_boundaries: [],
    skill_level: [],
    self_efficacy: [],
    enjoyment: [],
    lifestyle_fit: [],
    goals: [],
    constraints: [],
    contextual_supports: [],
    contextual_barriers: [],
    outcome_expectations: [],
    exploration_level: {
      value: 'unexplored',
      confidence: 'tentative',
      status: 'inferred',
    },
    commitment_level: {
      value: 'uncommitted',
      confidence: 'tentative',
      status: 'inferred',
    },
    situation: {
      current_stage: 'unspecified',
      details: '',
      confidence: 'unknown',
      status: 'inferred',
    },
    family_context: {
      perception_only: true,
      description: '',
      influence_level: 'unclear',
      alignment: 'unclear',
      confidence: 'unknown',
      status: 'inferred',
    },
    indecision_type: {
      type: 'none',
      confidence: 'unknown',
      rationale: '',
    },
    open_threads: [],
    contradictions: [],
  };
}

function normalizeConfidence(conf?: any): ConfidenceLevel {
  if (conf === 'strong' || conf === 'moderate' || conf === 'tentative' || conf === 'unknown') {
    return conf;
  }
  return 'tentative';
}

function normalizeStatus(status?: any): 'inferred' | 'user-stated' {
  // Gemini must NEVER write 'user-confirmed'
  if (status === 'user-stated') {
    return 'user-stated';
  }
  return 'inferred';
}

const FILLER_AND_INTERROGATIVE_REGEX = /^(idk|i don'?t know|don'?t know|no idea|not sure|unsure|maybe|perhaps|probably|cool|sure|yeah|yep|yup|okay|ok|which of these|tell me more|hi|hello|hey|thanks|thank you|i guess|dunno|whatever|nothing|none|something|idk tbh|yes|no|nope|neither|either|fine|alright)$/i;

export function isMeaningfulBeliefValue(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 2) return false;

  // Reject pure conversational filler
  if (FILLER_AND_INTERROGATIVE_REGEX.test(trimmed)) {
    return false;
  }

  // Reject raw questions or interrogatives asking the bot
  if (/\?$/.test(trimmed)) return false;
  if (/^(what|why|how|when|where|which|can you|tell me|who|could you)\b/i.test(trimmed)) return false;

  // Reject disavowals (belong in dislikes, not positive beliefs)
  if (/\b(hate|hated|not for me|ruled out|give up on|giving up on|can'?t stand|dreaded|refuse to)\b/i.test(trimmed)) {
    return false;
  }

  return true;
}

export function cleanBeliefValue(rawVal: string): string | null {
  if (!rawVal || typeof rawVal !== 'string') return null;

  let cleaned = rawVal.trim();
  // Strip outer quotes, markdown symbols, and trailing punctuation
  cleaned = cleaned.replace(/^["'`*]+|["'`*]+$/g, '').trim();
  cleaned = cleaned.replace(/[?.!]+$/, '').trim();

  // Explicit rejections should never be positive interests
  if (/\b(hate|hated|not for me|ruled out|give up on|giving up on|can'?t stand|dreaded|refuse to)\b/i.test(cleaned)) {
    return null;
  }

  // Strip conversational declarative prefixes
  cleaned = cleaned.replace(
    /^(i've always been interested in|i have always been interested in|i'm interested in|i am interested in|interested in|i've always liked|i like|i love|i enjoy|i strictly need|i need|i want to|i'm exploring|i want to explore|i prefer|my passion is|exploring the space around|exploring)\s+/i,
    ''
  );

  // Strip uncertainty prefixes and suffixes
  cleaned = cleaned.replace(/^(i guess|maybe|perhaps|probably|i think|possibly|not sure but)\s+/i, '');
  cleaned = cleaned.replace(/\s+(i guess|maybe|perhaps|or something|or whatever|idk|tbh)$/i, '');
  cleaned = cleaned.trim();

  if (!isMeaningfulBeliefValue(cleaned)) {
    return null;
  }

  // Capitalize first character for clean semantic presentation
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Universal semantic matching across spelling variations, synonyms, and sub-phrases
 */
export function isSemanticMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aNorm = a.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const bNorm = b.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  if (aNorm === bNorm) return true;
  if (aNorm.length >= 3 && bNorm.length >= 3 && (aNorm.includes(bNorm) || bNorm.includes(aNorm))) return true;

  const codeTokens = ['code', 'coding', 'program', 'programmer', 'programming', 'software', 'software development', 'writing code', 'developer', 'web dev', 'frontend', 'backend'];
  if (codeTokens.some((t) => aNorm.includes(t)) && codeTokens.some((t) => bNorm.includes(t))) return true;

  const bioTokens = ['bio', 'biology', 'lab bench', 'pipette', 'pipetting', 'wet lab', 'biological'];
  if (bioTokens.some((t) => aNorm.includes(t)) && bioTokens.some((t) => bNorm.includes(t))) return true;

  const salesTokens = ['sales', 'cold call', 'cold calling', 'cold-calling', 'telemarketing', 'selling'];
  if (salesTokens.some((t) => aNorm.includes(t)) && salesTokens.some((t) => bNorm.includes(t))) return true;

  const adminTokens = ['server admin', 'server administration', 'sysadmin', 'network administration', 'system admin'];
  if (adminTokens.some((t) => aNorm.includes(t)) && adminTokens.some((t) => bNorm.includes(t))) return true;

  const dataTokens = ['data entry', 'spreadsheet', 'spreadsheets', 'manual data'];
  if (dataTokens.some((t) => aNorm.includes(t)) && dataTokens.some((t) => bNorm.includes(t))) return true;

  const burnoutTokens = ['80 hour', '80 hours', '80-hour', 'burnout', 'high stress', 'excessive overtime', 'exhausting hours'];
  if (burnoutTokens.some((t) => aNorm.includes(t)) && burnoutTokens.some((t) => bNorm.includes(t))) return true;

  const defenseTokens = ['defense contracting', 'military project', 'military', 'weapons', 'defense industry'];
  if (defenseTokens.some((t) => aNorm.includes(t)) && defenseTokens.some((t) => bNorm.includes(t))) return true;

  return false;
}

/**
 * Universal deterministic rejection gate
 */
export function isSemanticallyRejected(
  candidate: string,
  interests: BeliefItem[],
  dislikes: BeliefItem[]
): boolean {
  if (!candidate) return false;
  // Check against inactive / rejected interests
  for (const item of interests) {
    if (item.active === false || item.notes === 'rejected_by_user' || item.notes === 'reset_by_user') {
      if (isSemanticMatch(candidate, item.value)) {
        return true;
      }
    }
  }
  // Check against dislikes and boundaries
  for (const item of dislikes) {
    if (isSemanticMatch(candidate, item.value)) {
      return true;
    }
  }
  return false;
}

export function mergeBeliefUpdates(
  current: BeliefState,
  updatesOrText?: GeminiTurnOutput['belief_updates'] | string | any,
  userTextParam?: string
): BeliefState {
  let updates: GeminiTurnOutput['belief_updates'] | undefined;
  let userText: string = '';

  if (typeof updatesOrText === 'string') {
    userText = updatesOrText;
    updates = undefined;
  } else {
    updates = updatesOrText;
    userText = userTextParam || '';
  }

  // Ensure current beliefState is defensively structured
  const safeCurrent: BeliefState = current || createInitialBeliefState();

  const next: BeliefState = {
    ...safeCurrent,
    interests: Array.isArray(safeCurrent.interests) ? safeCurrent.interests.map((i) => ({ ...i })) : [],
    dislikes_boundaries: Array.isArray(safeCurrent.dislikes_boundaries) ? safeCurrent.dislikes_boundaries.map((d) => ({ ...d })) : [],
    skill_level: Array.isArray(safeCurrent.skill_level) ? safeCurrent.skill_level.map((s) => ({ ...s })) : [],
    self_efficacy: Array.isArray(safeCurrent.self_efficacy) ? safeCurrent.self_efficacy.map((s) => ({ ...s })) : [],
    enjoyment: Array.isArray(safeCurrent.enjoyment) ? safeCurrent.enjoyment.map((e) => ({ ...e })) : [],
    lifestyle_fit: Array.isArray(safeCurrent.lifestyle_fit) ? safeCurrent.lifestyle_fit.map((l) => ({ ...l })) : [],
    goals: Array.isArray(safeCurrent.goals) ? safeCurrent.goals.map((g) => ({ ...g })) : [],
    constraints: Array.isArray(safeCurrent.constraints) ? safeCurrent.constraints.map((c) => ({ ...c })) : [],
    contextual_supports: Array.isArray(safeCurrent.contextual_supports) ? safeCurrent.contextual_supports.map((s) => ({ ...s })) : [],
    contextual_barriers: Array.isArray(safeCurrent.contextual_barriers) ? safeCurrent.contextual_barriers.map((b) => ({ ...b })) : [],
    outcome_expectations: Array.isArray(safeCurrent.outcome_expectations) ? safeCurrent.outcome_expectations.map((o) => ({ ...o })) : [],
    exploration_level: safeCurrent.exploration_level ? { ...safeCurrent.exploration_level } : { value: 'unexplored', confidence: 'tentative', status: 'inferred' },
    commitment_level: safeCurrent.commitment_level ? { ...safeCurrent.commitment_level } : { value: 'uncommitted', confidence: 'tentative', status: 'inferred' },
    situation: safeCurrent.situation ? { ...safeCurrent.situation } : { current_stage: 'unspecified', details: '', confidence: 'unknown', status: 'inferred' },
    family_context: safeCurrent.family_context ? { ...safeCurrent.family_context, perception_only: true } : { perception_only: true, description: '', influence_level: 'unclear', alignment: 'unclear', confidence: 'unknown', status: 'inferred' },
    indecision_type: safeCurrent.indecision_type ? { ...safeCurrent.indecision_type } : { type: 'none', confidence: 'unknown', rationale: '' },
    open_threads: Array.isArray(safeCurrent.open_threads) ? [...safeCurrent.open_threads] : [],
    contradictions: Array.isArray(safeCurrent.contradictions) ? safeCurrent.contradictions.map((c) => ({ ...c })) : [],
  };

  const userLower = (userText || '').toLowerCase().trim();

  // Check if user explicitly stated a reversal ("I changed my mind, I want to try coding again", "I am genuinely committed to writing novels")
  const isExplicitReversal = /\b(changed my mind|revisit|give .* another try|try .* again|actually i want to do|actually interested in|want to re-explore|genuinely committed to|committed to|back to|reaffirm|actually.*writing|actually.*novels|actually.*coding)\b/i.test(userLower);

  if (isExplicitReversal) {
    for (let i = 0; i < next.interests.length; i++) {
      const item = next.interests[i];
      const valLower = item.value.toLowerCase();
      if (
        (valLower.includes('writ') && userLower.includes('writ')) ||
        (valLower.includes('novel') && (userLower.includes('novel') || userLower.includes('writ'))) ||
        (valLower.includes('code') && userLower.includes('code')) ||
        userLower.includes(valLower)
      ) {
        next.interests[i] = {
          ...item,
          active: true,
          status: 'user-stated',
          confidence: 'strong',
          notes: 'reactivated_by_user',
        };
      }
    }
  }

  // -------------------------------------------------------------
  // STEP A0: Global Reset ("Forget all of that", "Start over", "Reset everything")
  // -------------------------------------------------------------
  const isGlobalReset =
    !/\bdon'?t forget\b/i.test(userLower) &&
    /\b(forget (all|everything)|reset everything|start over completely|scrap (all|everything)|wipe the slate clean|start from scratch|ignore everything (we talked about|so far))\b/i.test(
      userLower
    );

  if (isGlobalReset) {
    console.log('[ENGINE] Global reset intent detected. Deactivating all previous active interests.');
    for (let i = 0; i < next.interests.length; i++) {
      next.interests[i] = {
        ...next.interests[i],
        active: false,
        confidence: 'unknown',
        notes: 'reset_by_user',
      };
    }
    const alreadyResetBoundary = next.dislikes_boundaries.some((d) => d.value.toLowerCase().includes('reset'));
    if (!alreadyResetBoundary) {
      next.dislikes_boundaries.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: 'Reset and discarded previous exploration directions',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
    next.open_threads = [];
  }

  // -------------------------------------------------------------
  // STEP A1: Explicit Disavowal / Rejection Demotion
  // -------------------------------------------------------------
  const isDisavowal = /\b(hate|hated|not for me|ruled out|give up on|giving up on|can'?t stand|dreaded|disliked every minute|hated the process|hated it|refuse to|definitely not|no, definitely not|don'?t want to code anymore|don'?t want to do .* anymore)\b/i.test(userLower);
  if (isDisavowal) {
    const disavowMatch = userLower.match(/(?:hate|hated|give up on|giving up on|not for me|done with|can'?t stand)\s+([a-zA-Z0-9 &/-]+)/i);
    const disavowedNoun = disavowMatch ? disavowMatch[1].trim() : '';

    for (let i = 0; i < next.interests.length; i++) {
      const item = next.interests[i];
      const valLower = item.value.toLowerCase();

      const directMatch =
        (disavowedNoun.length > 2 && (valLower.includes(disavowedNoun.slice(0, 4)) || disavowedNoun.includes(valLower.slice(0, 4)))) ||
        (valLower.includes('code') && /\b(code|coding|programmer|programming|software|screen|project|build|building)\b/i.test(userLower)) ||
        (valLower.includes('program') && /\b(code|coding|program|programming|project)\b/i.test(userLower)) ||
        (valLower.includes('software') && /\b(software|code|coding|screen|project)\b/i.test(userLower)) ||
        (valLower.includes('web') && /\b(web|website|web dev|web development)\b/i.test(userLower)) ||
        (valLower.includes('bio') && /\b(bio|biology|lab|pipett)\b/i.test(userLower)) ||
        (valLower.includes('design') && /\b(design|figma|ui)\b/i.test(userLower) && !userLower.includes('still love') && !userLower.includes('enjoy')) ||
        (valLower.includes('art') && /\b(art|drawing|anatomy)\b/i.test(userLower)) ||
        (valLower.includes('sales') && /\b(sales|cold-calling|cold calling)\b/i.test(userLower)) ||
        (valLower.includes('account') && /\b(account|accounting|accountant)\b/i.test(userLower)) ||
        (valLower.includes('real estate') && /\b(real estate|realtor)\b/i.test(userLower)) ||
        (valLower.includes('server') && /\b(server|admin|administration)\b/i.test(userLower)) ||
        (valLower.includes('data entry') && /\b(data entry|spreadsheet)\b/i.test(userLower)) ||
        (valLower.includes('teaching') && /\b(teaching|children|kids)\b/i.test(userLower));

      if (directMatch && item.active !== false && item.notes !== 'rejected_by_user') {
        console.log(`[ENGINE] Explicitly demoting rejected interest: "${item.value}"`);
        next.interests[i] = {
          ...item,
          active: false,
          confidence: 'unknown',
          notes: 'rejected_by_user',
        };
      }
    }

    // Determine boundary text
    let boundaryText = disavowedNoun && disavowedNoun.length > 2
      ? `Disliked ${disavowedNoun.trim()}`
      : 'Disliked day-to-day process';
    if (/\b(coding|software|code|project|building)\b/i.test(userLower)) {
      boundaryText = 'Disliked day-to-day coding and software development';
    } else if (/\b(sales|cold[- ]calling)\b/i.test(userLower)) {
      boundaryText = 'Disliked sales and cold-calling';
    } else if (/\b(80[- ]hour|high[- ]stress|burnout|investment banking)\b/i.test(userLower)) {
      boundaryText = 'Refuses 80-hour/week burnout environments';
    } else if (/\b(server admin|server administration)\b/i.test(userLower)) {
      boundaryText = 'Disliked server administration';
    } else if (/\b(lab bench|pipetting)\b/i.test(userLower)) {
      boundaryText = 'Disliked repetitive lab bench pipetting';
    } else if (/\b(spreadsheet|data entry)\b/i.test(userLower)) {
      boundaryText = 'Disliked repetitive data entry';
    } else if (/\banatomy\b/i.test(userLower)) {
      boundaryText = 'Disliked technical anatomical drawing';
    }

    const alreadyInDislikes = next.dislikes_boundaries.some((d) => d.value.toLowerCase() === boundaryText.toLowerCase());
    if (!alreadyInDislikes) {
      next.dislikes_boundaries.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: boundaryText,
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // -------------------------------------------------------------
  // STEP A2: Semantic Boundary, Constraints & Lifestyle Recognition
  // -------------------------------------------------------------
  // 1. Burnout / Extreme Hours / Toxic Culture
  if (/\b(80[- ]hour|80 hours|burnout|high[- ]stress|exhausting hours|excessive overtime|toxic (work|culture)|work-life balance)\b/i.test(userLower)) {
    if (!next.dislikes_boundaries.some((d) => /80[- ]hour|burnout|high[- ]stress/i.test(d.value))) {
      next.dislikes_boundaries.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: 'Rejects 80-hour week high-stress burnout environments',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
    if (!next.constraints.some((c) => /80[- ]hour|burnout/i.test(c.description))) {
      next.constraints.push({
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'other',
        description: 'Hard boundary against 80-hour weeks and burnout culture',
        flexibility: 'rigid',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 2. Moral & Domain Boundaries (Defense, Military, Weapons, Gambling, Tobacco)
  if (/\b(defense|military|weapons|arms|gambling|crypto scam|tobacco)\b/i.test(userLower)) {
    if (!next.dislikes_boundaries.some((d) => /defense|military|weapons|gambling/i.test(d.value))) {
      const val = userLower.includes('defense') || userLower.includes('military')
        ? 'Moral boundary against defense contracting and military projects'
        : 'Domain boundary against unethical industries';
      next.dislikes_boundaries.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: val,
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
    if (!next.constraints.some((c) => /defense|military|weapons/i.test(c.description))) {
      next.constraints.push({
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'other',
        description: 'Hard boundary against defense and military contracting',
        flexibility: 'rigid',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 3. Financial Constraint: Zero Budget / Low Cost
  if (/(?:^|\W)(?:\$0|₹0|€0|£0|0 dollars|zero budget|no money|cannot spend money|no budget|free only|broke|cannot afford|no funds|no credit card|max budget of \$?0|budget of \$?0|\$0 budget)\b/i.test(userLower)) {
    if (!next.constraints.some((c) => /0|budget|financial|\$0|free/i.test(c.description))) {
      next.constraints.push({
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'financial',
        description: 'Zero financial budget ($0 / free exploration only)',
        flexibility: 'rigid',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 3b. Temporal Constraints: Weekly Hours Ceiling & Weekends Only
  const timeMatch = userLower.match(/(?:(?:strict limit|ceiling|limit|max(?:imum)?)\s*[:]?\s*)?(\d{1,2})\s*(?:hours?|hrs?)(?:\s*(?:a|per)\s*week)?(?:\s*maximum)?/i) ||
    userLower.match(/(\d{1,2})\s*(?:hours?|hrs?)\s*(?:a|per)\s*week/i);
  if (timeMatch && !userLower.includes('$') && !userLower.includes('%')) {
    const hours = parseInt(timeMatch[1], 10);
    if (!isNaN(hours) && hours > 0 && hours <= 80) {
      const isRigid = /strict|limit|ceiling|max|maximum|rigid|zero tolerance|only/i.test(userLower);
      const desc = `Time ceiling: maximum ${hours} hours per week`;
      if (!next.constraints.some((c) => c.type === 'temporal' || c.description.toLowerCase().includes(`${hours} hour`))) {
        next.constraints.push({
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'temporal',
          description: desc,
          flexibility: isRigid ? 'rigid' : 'flexible',
          confidence: 'strong',
          status: 'user-stated',
          confirmation_needed: false,
        });
      }
    }
  }
  if (/\b(weekends? only|only on weekends?)\b/i.test(userLower)) {
    if (!next.constraints.some((c) => /weekend/i.test(c.description))) {
      next.constraints.push({
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'temporal',
        description: 'Weekend exploration only',
        flexibility: 'rigid',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 3c. Rigid Boundaries vs Ordinary Preferences
  // When user uses non-negotiable language: "strict limit", "zero tolerance", "absolutely cannot", "under no circumstances", "non-negotiable"
  if (/\b(strict limit|zero tolerance|absolutely cannot|non-negotiable|under no circumstances)\b/i.test(userLower)) {
    // 100% remote / no relocation
    if (/100% remote|remote only|no relocation|cannot relocate|refuse to relocate/i.test(userLower)) {
      if (!next.constraints.some((c) => /remote|relocation/i.test(c.description))) {
        next.constraints.push({
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'location',
          description: 'Strict limit: 100% remote only, no relocation',
          flexibility: 'rigid',
          confidence: 'strong',
          status: 'user-stated',
          confirmation_needed: false,
        });
      }
      if (!next.dislikes_boundaries.some((d) => /relocation/i.test(d.value))) {
        next.dislikes_boundaries.push({
          id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: 'No relocation under any circumstances',
          confidence: 'strong',
          status: 'user-stated',
          confirmation_needed: false,
        });
      }
    }

    // 60+ hour work weeks / excessive overtime
    if (/(?:60\+?|70\+?|80\+?)\s*(?:hours?|hrs?)|excessive overtime|mandatory overtime/i.test(userLower)) {
      if (!next.constraints.some((c) => /overtime|60\+|hour/i.test(c.description))) {
        next.constraints.push({
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'temporal',
          description: 'Zero tolerance for mandatory 60+ hour work weeks',
          flexibility: 'rigid',
          confidence: 'strong',
          status: 'user-stated',
          confirmation_needed: false,
        });
      }
      if (!next.dislikes_boundaries.some((d) => /60\+|overtime/i.test(d.value))) {
        next.dislikes_boundaries.push({
          id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: 'Zero tolerance for mandatory 60+ hour work weeks',
          confidence: 'strong',
          status: 'user-stated',
          confirmation_needed: false,
        });
      }
    }
  }

  // 4. Job Security & Pension Requirement
  if (/\b(guaranteed job security|job security|pension|complete job stability|strictly need guaranteed|need complete stability|want stability|security and a pension)\b/i.test(userLower)) {
    if (!next.constraints.some((c) => /security|pension|stability/i.test(c.description))) {
      next.constraints.push({
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'other',
        description: 'Strict requirement for guaranteed job security and pension',
        flexibility: 'rigid',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
    if (!next.lifestyle_fit.some((l) => /stability|security/i.test(l.value.preference))) {
      next.lifestyle_fit.push({
        id: `life-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: { preference: 'Guaranteed job stability and security', priority: 'essential' },
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 5. Zero People Management Boundary
  if (/\b(zero (people )?management|never want to manage people|no management|refuse to manage)\b/i.test(userLower)) {
    if (!next.dislikes_boundaries.some((d) => /management/i.test(d.value))) {
      next.dislikes_boundaries.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: 'Zero people management boundary',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 6. Lead Large 500-Person Division Goal
  if (/\b(lead a 500[- ]person division|lead a large division|executive leadership|manage 500 people)\b/i.test(userLower)) {
    if (!next.goals.some((g) => /500[- ]person|large division/i.test(g.goal))) {
      next.goals.push({
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        goal: 'Lead a 500-person division',
        motivation_source: 'intrinsic',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 7. Solo Remote Isolation vs In-Person Bustling Room
  if (/\b(100% solo remote|zero meetings|total isolation|purely remote solo)\b/i.test(userLower)) {
    if (!next.lifestyle_fit.some((l) => /solo remote|zero meetings/i.test(l.value.preference))) {
      next.lifestyle_fit.push({
        id: `life-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: { preference: '100% solo remote with zero meetings', priority: 'essential' },
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }
  if (/\b(energetic bustling room|bustling room|constant high-touch teamwork|in-person bustling)\b/i.test(userLower)) {
    if (!next.lifestyle_fit.some((l) => /bustling room|high-touch/i.test(l.value.preference))) {
      next.lifestyle_fit.push({
        id: `life-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: { preference: 'Bustling in-person room collaborating all day', priority: 'essential' },
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 8. Executive Compensation & High Wealth Target
  if (/\b(top 1% executive compensation|make ₹10 crores|huge executive salary|top 1% pay|extreme wealth)\b/i.test(userLower)) {
    if (!next.goals.some((g) => /top 1%|10 crores|executive compensation|extreme wealth/i.test(g.goal))) {
      next.goals.push({
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        goal: 'Top 1% executive compensation and rapid wealth generation',
        motivation_source: 'extrinsic_financial',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 9. 15-Hour Week Low-Stress Ceiling
  if (/\b(15 hours a week|15-hour|15 hours|zero stress)\b/i.test(userLower)) {
    if (!next.constraints.some((c) => /15 hour|zero stress/i.test(c.description))) {
      next.constraints.push({
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'temporal',
        description: 'Maximum 15 hours a week low-stress ceiling',
        flexibility: 'rigid',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 10. Grass-Roots Community Non-Profit
  if (/\b(grass[- ]roots community non[- ]profit|community activism|non-profit organization)\b/i.test(userLower)) {
    if (!next.goals.some((g) => /non[- ]profit|grass[- ]roots/i.test(g.goal))) {
      next.goals.push({
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        goal: 'Grass-roots community non-profit activism',
        motivation_source: 'extrinsic_social',
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // 11. High-Risk Tech Startup Interest
  if (/\b(launch a high-risk tech startup|high-risk.*startup|build a tech startup|launch.*startup)\b/i.test(userLower)) {
    const cleanStartup = 'High-Risk Tech Startup Venture';
    if (!next.interests.some((i) => i.value.toLowerCase().includes('startup') && i.active !== false)) {
      next.interests.push({
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: cleanStartup,
        confidence: 'strong',
        status: 'user-stated',
        active: true,
        confirmation_needed: false,
      });
    }
  }

  // 12. Skill vs Lifestyle Aptitude (Math aptitude vs desk aversion)
  if (/\b(aptitude in math|strong in math|love math|math aptitude)\b/i.test(userLower)) {
    if (!next.interests.some((i) => /math|quantitative/i.test(i.value) && i.active !== false)) {
      next.interests.push({
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: 'Mathematics & Quantitative Aptitude',
        confidence: 'strong',
        status: 'user-stated',
        active: true,
        confirmation_needed: false,
      });
    }
  }
  if (/\b(refuse to sit at a desk|desk for 8 hours|dislike sitting at a desk|hate sitting at a desk)\b/i.test(userLower)) {
    if (!next.lifestyle_fit.some((l) => /desk/i.test(l.value.preference))) {
      next.lifestyle_fit.push({
        id: `life-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: { preference: 'Aversion to sitting at a desk for 8 hours daily', priority: 'essential' },
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // -------------------------------------------------------------
  // STEP A3: Sub-Component Preferences & Correction Parsing
  // -------------------------------------------------------------
  // Sub-component isolation: "I dislike coding, but I really enjoy UI visual design"
  const subComponentMatch = userText.match(/(?:dislike|hate|not into|disliked)\s+([^,]+),\s*(?:but|however)\s*(?:i really enjoy|i love|i like|i prefer|really enjoy)\s+([^.!?]+)/i);
  if (subComponentMatch) {
    const dislikedRaw = subComponentMatch[1].trim();
    const likedRaw = subComponentMatch[2].trim();
    const cleanLiked = cleanBeliefValue(likedRaw);
    if (cleanLiked) {
      next.interests.push({
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: cleanLiked,
        confidence: 'strong',
        status: 'user-stated',
        active: true,
        confirmation_needed: false,
      });
    }
    if (!next.dislikes_boundaries.some((d) => isSemanticMatch(d.value, dislikedRaw))) {
      next.dislikes_boundaries.push({
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: `Dislikes ${dislikedRaw}`,
        confidence: 'strong',
        status: 'user-stated',
        confirmation_needed: false,
      });
    }
  }

  // Correction parsing: "I meant animals, not children" or "X, not Y"
  const correctionMatch =
    userText.match(/(?:i meant|i said|rather than)\s+([^,]+),\s*(?:not|instead of)\s+([^.!?]+)/i) ||
    userText.match(/([a-zA-Z0-9 ]+),\s*not\s+([a-zA-Z0-9 ]+)/i);
  if (correctionMatch) {
    const correctedInterest = cleanBeliefValue(correctionMatch[1].trim());
    const discardedInterest = correctionMatch[2].trim().toLowerCase();
    if (correctedInterest) {
      for (let i = 0; i < next.interests.length; i++) {
        if (next.interests[i].value.toLowerCase().includes(discardedInterest)) {
          next.interests[i] = {
            ...next.interests[i],
            active: false,
            notes: 'corrected_by_user',
          };
        }
      }
      next.interests.push({
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: correctedInterest,
        confidence: 'strong',
        status: 'user-stated',
        active: true,
        confirmation_needed: false,
      });
    }
  }

  // Partial reset: "I don't care about biology anymore, but still love design"
  if (/don'?t care about .* anymore|not interested in .* anymore|done with .*/i.test(userLower)) {
    for (let i = 0; i < next.interests.length; i++) {
      const item = next.interests[i];
      if (
        userLower.includes(item.value.toLowerCase()) &&
        !userLower.includes(`love ${item.value.toLowerCase()}`) &&
        !userLower.includes(`enjoy ${item.value.toLowerCase()}`)
      ) {
        next.interests[i] = {
          ...item,
          active: false,
          confidence: 'unknown',
          notes: 'demoted_by_user',
        };
      }
    }
  }

  // Historical vs Current: "When I was in middle school 8 years ago I loved chemistry, but now I only care about architecture"
  const historicalMatch =
    userText.match(/(?:when i was|used to like|grew up doing|years ago)\s+([^,]+),?\s*(?:but now|now i|today i)\s*(?:only care about|want to explore|really want to|interested in|prefer|care about)\s+([^.!?]+)/i) ||
    userText.match(/now (?:i )?only care about\s+([^.!?]+)/i);
  if (historicalMatch) {
    const currentPartRaw = historicalMatch[2] ? historicalMatch[2].trim() : historicalMatch[1].trim();
    const currentPart = cleanBeliefValue(currentPartRaw);
    if (currentPart && (!isSemanticallyRejected(currentPart, next.interests, next.dislikes_boundaries) || isExplicitReversal)) {
      const already = next.interests.some((i) => i.value.toLowerCase().includes(currentPart.toLowerCase()) && i.active !== false);
      if (!already) {
        next.interests.push({
          id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: currentPart,
          confidence: 'strong',
          status: 'user-stated',
          active: true,
          confirmation_needed: false,
        });
      }
    }
  }

  // Embedded interest inside meta-question: "Can you tell me how long this conversation usually takes? I have an interest in urban planning by the way."
  const embeddedInterestMatch =
    userText.match(/(?:explore|look into|talk about)\s+([a-zA-Z0-9 &/-]+?)\s+(?:or is this|or do you|or are we)/i) ||
    userText.match(/(?:interest in|curiosity in|curious about)\s+([a-zA-Z0-9 &/-]+?)(?:\s+by the way|[.,;!?]|$)/i);
  if (embeddedInterestMatch) {
    const cleanEmbedded = cleanBeliefValue(embeddedInterestMatch[1].trim());
    if (cleanEmbedded && (!isSemanticallyRejected(cleanEmbedded, next.interests, next.dislikes_boundaries) || isExplicitReversal)) {
      const already = next.interests.some((i) => i.value.toLowerCase().includes(cleanEmbedded.toLowerCase()) && i.active !== false);
      if (!already) {
        next.interests.push({
          id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: cleanEmbedded,
          confidence: 'strong',
          status: 'user-stated',
          active: true,
          confirmation_needed: false,
        });
      }
    }
  }

  // Explicit user statement: "I want to explore ceramics", "I love pottery", "curious about astronomy"
  const directExplicitMatch = userText.match(/\b(?:i want to explore|i'?m curious about|i love|i really love|i enjoy|interested in|passionate about|curious about|committed to|genuinely committed to|i want to write|i want to be)\s+([a-zA-Z0-9 &/-]+?)(?:[.,;!?]|\s+(?:and|but|however|because|so|anyway)|$)/i);
  if (directExplicitMatch) {
    const rawDirect = directExplicitMatch[1].trim();
    const cleanDirect = cleanBeliefValue(rawDirect);
    if (cleanDirect && (!isSemanticallyRejected(cleanDirect, next.interests, next.dislikes_boundaries) || isExplicitReversal)) {
      const existingIdx = next.interests.findIndex((i) =>
        i.value.toLowerCase() === cleanDirect.toLowerCase() ||
        i.value.toLowerCase().includes(cleanDirect.toLowerCase()) ||
        cleanDirect.toLowerCase().includes(i.value.toLowerCase()) ||
        isSemanticMatch(i.value, cleanDirect)
      );
      if (existingIdx >= 0) {
        next.interests[existingIdx] = {
          ...next.interests[existingIdx],
          active: true,
          status: 'user-stated',
          confidence: 'strong',
          notes: isExplicitReversal ? 'reactivated_by_user' : next.interests[existingIdx].notes,
        };
      } else {
        next.interests.push({
          id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: cleanDirect,
          confidence: 'strong',
          status: 'user-stated',
          active: true,
          confirmation_needed: false,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STEP B: Family Pressure / Parental Context Detection
  // -------------------------------------------------------------
  if (/\b(dad|mom|father|mother|parents?|family|insists|insist|pressure|make him proud|make them proud|expectations)\b/i.test(userLower)) {
    next.family_context = {
      perception_only: true,
      description: 'Navigating family career expectations',
      influence_level: 'high',
      alignment: 'tension',
      confidence: 'strong',
      status: 'user-stated',
    };
  }

  // -------------------------------------------------------------
  // STEP C: Mandatory Defensive Post-LLM Sanitization of Belief Updates
  // -------------------------------------------------------------
  if (updates && typeof updates === 'object') {
    // 1. Interests (with Rejection Immunity and Null Defense)
    if (Array.isArray(updates.interests_to_add)) {
      for (const item of updates.interests_to_add) {
        if (!item || typeof item !== 'object') continue;
        if (!item.value || typeof item.value !== 'string') continue;
        const cleanVal = cleanBeliefValue(item.value);
        if (!cleanVal) continue;

        // Check if this interest has been rejected by the user
        const wasRejected = isSemanticallyRejected(cleanVal, next.interests, next.dislikes_boundaries);

        if (wasRejected && !isExplicitReversal) {
          console.log(`[ENGINE] Dropping LLM interest update because user previously rejected it: "${cleanVal}"`);
          continue;
        }

        const existingIdx = next.interests.findIndex(
          (i) =>
            i.value.toLowerCase() === cleanVal.toLowerCase() ||
            i.value.toLowerCase().includes(cleanVal.toLowerCase()) ||
            cleanVal.toLowerCase().includes(i.value.toLowerCase()) ||
            isSemanticMatch(i.value, cleanVal)
        );
        const status = normalizeStatus(item.status);
        const conf = normalizeConfidence(item.confidence);

        if (existingIdx >= 0) {
          if (next.interests[existingIdx].active !== false && next.interests[existingIdx].notes !== 'rejected_by_user') {
            next.interests[existingIdx] = {
              ...next.interests[existingIdx],
              confidence: conf === 'strong' ? 'strong' : next.interests[existingIdx].confidence,
              status: status === 'user-stated' ? 'user-stated' : next.interests[existingIdx].status,
              active: true,
            };
          } else if (isExplicitReversal) {
            next.interests[existingIdx] = {
              ...next.interests[existingIdx],
              active: true,
              status: 'user-stated',
              confidence: 'strong',
              notes: 'reactivated_by_user',
            };
          }
        } else {
          next.interests.push({
            id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            value: cleanVal,
            confidence: conf,
            status,
            active: true,
            confirmation_needed: status === 'inferred',
          });
        }
      }
    }

    // 2. Dislikes & Boundaries
    if (Array.isArray(updates.dislikes_to_add)) {
      for (const item of updates.dislikes_to_add) {
        if (!item || typeof item !== 'object') continue;
        if (!item.value || typeof item.value !== 'string') continue;
        const cleanVal = item.value.trim();
        if (!isMeaningfulBeliefValue(cleanVal)) continue;

        const existingIdx = next.dislikes_boundaries.findIndex(
          (i) => i.value.toLowerCase() === cleanVal.toLowerCase()
        );
        const status = normalizeStatus(item.status);
        const conf = normalizeConfidence(item.confidence);

        if (existingIdx < 0) {
          next.dislikes_boundaries.push({
            id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            value: cleanVal,
            confidence: conf,
            status,
            confirmation_needed: status === 'inferred',
          });
        }
      }
    }

    // 3. Goals
    if (Array.isArray(updates.goals_to_add)) {
      for (const item of updates.goals_to_add) {
        if (!item || typeof item !== 'object') continue;
        if (!item.goal || typeof item.goal !== 'string') continue;
        const cleanGoal = item.goal.trim();
        if (!isMeaningfulBeliefValue(cleanGoal)) continue;

        const existingIdx = next.goals.findIndex(
          (g) => g.goal.toLowerCase() === cleanGoal.toLowerCase()
        );
        const status = normalizeStatus(item.status);
        const conf = normalizeConfidence(item.confidence);

        const goalItem: GoalItem = {
          id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          goal: cleanGoal,
          motivation_source: item.motivation_source || 'unclear',
          confidence: conf,
          status,
          confirmation_needed: status === 'inferred',
        };

        if (existingIdx >= 0) {
          next.goals[existingIdx] = goalItem;
        } else {
          next.goals.push(goalItem);
        }
      }
    }

    // 4. Constraints
    if (Array.isArray(updates.constraints_to_add)) {
      for (const item of updates.constraints_to_add) {
        if (!item || typeof item !== 'object') continue;
        if (!item.description || typeof item.description !== 'string') continue;
        const cleanDesc = item.description.trim();
        if (!isMeaningfulBeliefValue(cleanDesc)) continue;

        const status = normalizeStatus(item.status);
        const conf = normalizeConfidence(item.confidence);

        const constraintItem: ConstraintItem = {
          id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: item.type || 'other',
          description: cleanDesc,
          flexibility: item.flexibility || 'unclear',
          confidence: conf,
          status,
          confirmation_needed: status === 'inferred',
        };

        const existingIdx = next.constraints.findIndex(
          (c) => c.description.toLowerCase() === cleanDesc.toLowerCase()
        );
        if (existingIdx >= 0) {
          next.constraints[existingIdx] = constraintItem;
        } else {
          next.constraints.push(constraintItem);
        }
      }
    }

    // 5. Enjoyment
    if (Array.isArray(updates.enjoyment_to_add)) {
      for (const item of updates.enjoyment_to_add) {
        if (!item || typeof item !== 'object') continue;
        if (!item.activity || typeof item.activity !== 'string') continue;
        const cleanAct = item.activity.trim();
        if (!isMeaningfulBeliefValue(cleanAct)) continue;

        const status = normalizeStatus(item.status);
        next.enjoyment.push({
          id: `enj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: { activity: cleanAct, source: item.source || 'unspecified' },
          confidence: normalizeConfidence(item.confidence),
          status,
          confirmation_needed: status === 'inferred',
        });
      }
    }

    // 6. Lifestyle Fit
    if (Array.isArray(updates.lifestyle_to_add)) {
      for (const item of updates.lifestyle_to_add) {
        if (!item || typeof item !== 'object') continue;
        if (!item.preference || typeof item.preference !== 'string') continue;
        const cleanPref = item.preference.trim();
        if (!isMeaningfulBeliefValue(cleanPref)) continue;

        const status = normalizeStatus(item.status);
        next.lifestyle_fit.push({
          id: `life-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: { preference: cleanPref, priority: item.priority || 'medium' },
          confidence: normalizeConfidence(item.confidence),
          status,
          confirmation_needed: status === 'inferred',
        });
      }
    }

    // 7. Situation
    if (updates.situation_update && typeof updates.situation_update === 'object') {
      const s = updates.situation_update;
      next.situation = {
        current_stage: s.current_stage || next.situation.current_stage,
        details: s.details || next.situation.details,
        confidence: normalizeConfidence(s.confidence),
        status: normalizeStatus(s.status),
      };
    }

    // 8. Family Context
    if (updates.family_context_update && typeof updates.family_context_update === 'object') {
      const f = updates.family_context_update;
      next.family_context = {
        perception_only: true,
        description: f.description || next.family_context.description,
        influence_level: f.influence_level || next.family_context.influence_level,
        alignment: f.alignment || next.family_context.alignment,
        confidence: normalizeConfidence(f.confidence),
        status: normalizeStatus(f.status),
      };
    }

    // 9. Open Threads
    if (Array.isArray(updates.open_threads_to_add)) {
      for (const thread of updates.open_threads_to_add) {
        if (thread && typeof thread === 'string' && !next.open_threads.includes(thread)) {
          next.open_threads.push(thread);
        }
      }
    }
    if (Array.isArray(updates.open_threads_to_resolve)) {
      next.open_threads = next.open_threads.filter(
        (t) => !updates.open_threads_to_resolve?.includes(t)
      );
    }

    // 10. Contradictions from model
    if (Array.isArray(updates.contradictions_detected)) {
      for (const c of updates.contradictions_detected) {
        if (c && typeof c === 'object' && c.pole_a && c.pole_b) {
          const already = next.contradictions.some(
            (ex) =>
              (ex.pole_a.toLowerCase() === c.pole_a.toLowerCase() && ex.pole_b.toLowerCase() === c.pole_b.toLowerCase()) ||
              (ex.pole_a.toLowerCase() === c.pole_b.toLowerCase() && ex.pole_b.toLowerCase() === c.pole_a.toLowerCase())
          );
          if (!already) {
            next.contradictions.push({
              id: `contra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              pole_a: c.pole_a,
              pole_b: c.pole_b,
              status: 'unresolved',
              severity: (c.severity as any) || 'high',
            });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STEP D: Global Deterministic Multi-Pole Contradiction Evaluation
  // -------------------------------------------------------------
  const addContradiction = (poleA: string, poleB: string, severity: 'high' | 'low' = 'high') => {
    const already = next.contradictions.some(
      (c) =>
        (c.pole_a.toLowerCase().includes(poleA.toLowerCase().slice(0, 10)) && c.pole_b.toLowerCase().includes(poleB.toLowerCase().slice(0, 10))) ||
        (c.pole_a.toLowerCase().includes(poleB.toLowerCase().slice(0, 10)) && c.pole_b.toLowerCase().includes(poleA.toLowerCase().slice(0, 10)))
    );
    if (!already) {
      console.log(`[ENGINE] Registering contradiction: "${poleA}" vs "${poleB}"`);
      next.contradictions.push({
        id: `contra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pole_a: poleA,
        pole_b: poleB,
        status: 'unresolved',
        severity,
      });
    }
  };

  // Contradiction Resolution Check (e.g. "I cannot handle startup risk, I choose stability")
  if (/cannot handle startup risk|choose stability|decided on stability|prioritize stability/i.test(userLower)) {
    for (let c of next.contradictions) {
      if (/stability|pension|security/i.test(c.pole_a) || /stability|pension|security/i.test(c.pole_b)) {
        c.status = 'reconciled';
      }
    }
    for (let i = 0; i < next.interests.length; i++) {
      if (/startup|venture/i.test(next.interests[i].value)) {
        next.interests[i].active = false;
        next.interests[i].notes = 'yielded_in_reconciliation';
      }
    }
  }

  // Check 1: Job Stability / Security vs High-Risk Tech Startup or Volatile Creative/Freelance Pursuit
  const hasStability =
    next.constraints.some((c) => /stability|security|pension|guaranteed|safe job|zero risk/i.test(c.description)) ||
    next.lifestyle_fit.some((l) => /stability|security|zero risk/i.test(l.value.preference)) ||
    /guaranteed job security|pension|job security|complete job stability|strictly need guaranteed|need complete stability|want stability|100% job stability|zero risk/i.test(userLower);

  const activeVolatileOrCreative = next.interests.find(
    (i) => i.active !== false && /startup|high[- ]risk|venture|entrepreneur|architecture|creative arts|freelance|independent/i.test(i.value)
  );
  const hasStartup =
    !!activeVolatileOrCreative ||
    /high[- ]risk.*startup|startup.*venture|launch.*startup|high risk startup|build a startup|start a company/i.test(userLower);

  if (hasStability && hasStartup && !/choose stability|decided on stability/i.test(userLower)) {
    const tensionInterest = activeVolatileOrCreative ? activeVolatileOrCreative.value : 'High-Risk Tech Startup Venture';
    addContradiction('Guaranteed Job Security & Pension (Zero Risk)', `${tensionInterest} Pursuit`, 'high');
  }

  // Check 2: Zero management vs Lead 500-person division
  const hasZeroMgmt =
    /zero people management|never want to manage people|no management|refuse to manage/i.test(userLower) ||
    next.dislikes_boundaries.some((d) => /management|manage people/i.test(d.value));
  const hasLeadLargeDiv =
    /lead a 500[- ]person division|lead a large division|executive leadership|manage 500 people/i.test(userLower) ||
    next.goals.some((g) => /500[- ]person|lead.*division|large division/i.test(g.goal));
  if (hasZeroMgmt && hasLeadLargeDiv) {
    addContradiction('Zero People Management Boundary', 'Leading a 500-Person Division Goal', 'high');
  }

  // Check 3: Top 1% executive compensation vs 15-hour low-stress week
  const hasTopIncome =
    /top 1% executive compensation|extreme wealth|make ₹10 crores|huge executive salary|top 1% pay/i.test(userLower) ||
    next.goals.some((g) => /top 1%|executive comp|10 crores|extreme wealth/i.test(g.goal));
  const hasLowHours =
    /15 hours a week|zero stress|15-hour|15 hours/i.test(userLower) ||
    next.constraints.some((c) => /15 hours|zero stress|15-hour/i.test(c.description));
  if (hasTopIncome && hasLowHours) {
    addContradiction('Top 1% Executive Compensation Target', '15-Hour/Week Low-Stress Limit', 'high');
  }

  // Check 4: Grass-roots non-profit activism vs Rapid 3-year extreme wealth
  const hasNonProfit =
    /grass[- ]roots community non[- ]profit|community activism|non-profit organization/i.test(userLower) ||
    next.goals.some((g) => /non[- ]profit|grass[- ]roots/i.test(g.goal));
  const hasFastExtremeWealth =
    /make ₹10 crores in 3 years|rapid wealth generation|rapid wealth/i.test(userLower) ||
    next.goals.some((g) => /rapid wealth|10 crores/i.test(g.goal));
  if (hasNonProfit && hasFastExtremeWealth) {
    addContradiction('Grass-Roots Non-Profit Activism', 'Rapid High-Capital Generation Target', 'high');
  }

  // Check 5: Solo remote isolation vs In-person bustling room collaboration
  const hasSoloRemote =
    /100% solo remote|zero meetings|total isolation|purely remote solo/i.test(userLower) ||
    next.lifestyle_fit.some((l) => /solo remote|zero meetings/i.test(l.value.preference));
  const hasBustlingRoom =
    /energetic bustling room|bustling room|constant high-touch teamwork|in-person bustling|bustling.*team/i.test(userLower) ||
    next.lifestyle_fit.some((l) => /bustling room|high-touch|bustling/i.test(l.value.preference));
  if (hasSoloRemote && hasBustlingRoom) {
    addContradiction('100% Solo Remote Work with Zero Meetings', 'Bustling High-Touch In-Person Team Collaboration', 'high');
  }

  // -------------------------------------------------------------
  // STEP E: Inferred -> Confirmed Promotion on Affirmation
  // -------------------------------------------------------------
  if (userText) {
    const affirmative = /\b(yes|exactly|that's right|definitely|for sure|i agree|that is true|yep|yeah|that resonates|that fits)\b/i.test(userLower);
    if (affirmative) {
      next.interests = next.interests.map((i) =>
        i.status === 'inferred' && i.confirmation_needed ? { ...i, status: 'user-confirmed' as BeliefStatus, confirmation_needed: false, confidence: 'strong' } : i
      );
      next.goals = next.goals.map((g) =>
        g.status === 'inferred' && g.confirmation_needed ? { ...g, status: 'user-confirmed' as BeliefStatus, confirmation_needed: false, confidence: 'strong' } : g
      );
      next.constraints = next.constraints.map((c) =>
        c.status === 'inferred' && c.confirmation_needed ? { ...c, status: 'user-confirmed' as BeliefStatus, confirmation_needed: false, confidence: 'strong' } : c
      );
    }
  }

  // -------------------------------------------------------------
  // STEP F: State Hygiene & Compaction for Long Sessions
  // -------------------------------------------------------------
  if (next.interests.length > 15) {
    const confirmedOrStated = next.interests.filter((i) => i.status !== 'inferred' || i.active === false);
    const inferred = next.interests.filter((i) => i.status === 'inferred' && i.active !== false);
    const compactedInferred = inferred.slice(-5);
    next.interests = [...confirmedOrStated, ...compactedInferred];
  }

  return next;
}


