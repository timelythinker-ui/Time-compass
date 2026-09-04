// Question Candidate Filter & Selector for Timely Compass

import { CandidateQuestion, BeliefState, DirectionalImpact } from './types';
import { lintTextForSafety } from './safetyLinter';

export interface FilterResult {
  accepted: CandidateQuestion | null;
  selectedQuestion?: CandidateQuestion | null;
  rejectedCount: number;
  reasons: string[];
}

function isClosedFormQuestion(q: string): boolean {
  const trimmed = q.trim();
  // Check for simple binary questions
  const binaryStarters = /^(do you|did you|are you|is it|can you|have you|would you say yes or no)\b/i;
  // If it starts with binary starter and doesn't contain open-ended phrasing
  if (binaryStarters.test(trimmed) && !trimmed.toLowerCase().includes('what') && !trimmed.toLowerCase().includes('how') && !trimmed.toLowerCase().includes('or')) {
    return true;
  }
  return false;
}

function isCompoundQuestion(q: string): boolean {
  const trimmed = q.trim();
  const qMarkCount = (trimmed.match(/\?/g) || []).length;
  if (qMarkCount > 1) return true;

  // Check for compound sentences with multiple questions joined by and/or
  if (/\b(also, (what|how|why|which)|and (what|how|why|which))\b/i.test(trimmed) && trimmed.includes('?')) {
    return true;
  }
  return false;
}

function isRedundantWithBeliefs(q: CandidateQuestion, beliefState: BeliefState): boolean {
  if (!q || !q.target_field) return false;
  const field = q.target_field.toLowerCase();

  // If asking about goals when we already have 2+ strong goals
  if (field.includes('goal') && Array.isArray(beliefState.goals) && beliefState.goals.filter((g) => g.confidence === 'strong').length >= 2) {
    return false; // Still allow deeper goal exploration if directional impact is high
  }

  // If asking literally the exact same phrase as an already settled item
  if (Array.isArray(beliefState.interests)) {
    for (const item of beliefState.interests) {
      if (item && item.confidence === 'strong' && q.question && q.question.toLowerCase().includes(item.value.toLowerCase())) {
        // It's already settled unless it explores tradeoffs
        if (q.question.toLowerCase().includes('why') || q.question.toLowerCase().includes('how')) {
          return false;
        }
      }
    }
  }

  return false;
}

export function filterAndSelectQuestion(
  candidates: CandidateQuestion[] | undefined,
  beliefState: BeliefState,
  lastQuestionAsked?: string
): FilterResult {
  const reasons: string[] = [];

  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return { accepted: null, rejectedCount: 0, reasons: ['NO_CANDIDATES_PROVIDED'] };
  }

  const validCandidates: CandidateQuestion[] = [];

  for (const c of candidates) {
    // 1. Malformed check & Null defense
    if (!c || typeof c !== 'object' || !c.question || typeof c.question !== 'string' || c.question.trim().length < 5) {
      reasons.push('MALFORMED_QUESTION');
      continue;
    }

    let questionText = c.question.trim();

    // Ensure it ends with a question mark if missing
    if (!questionText.endsWith('?')) {
      questionText = `${questionText}?`;
    }

    // 2. Compound question check (Must be single question)
    if (isCompoundQuestion(questionText)) {
      // Split and take the first single question
      const parts = questionText.split('?');
      if (parts[0] && parts[0].trim().length >= 10) {
        questionText = `${parts[0].trim()}?`;
      } else {
        reasons.push('COMPOUND_QUESTION');
        continue;
      }
    }

    // Prevent immediate repeated question
    if (lastQuestionAsked && questionText.toLowerCase() === lastQuestionAsked.toLowerCase()) {
      reasons.push('DUPLICATE_OF_PREVIOUS_QUESTION');
      continue;
    }

    // 3. Already-resolved / Redundancy check
    if (isRedundantWithBeliefs(c, beliefState)) {
      reasons.push('REDUNDANT_WITH_KNOWN_BELIEFS');
      continue;
    }

    // 4. Guardrail / Safety check
    const safety = lintTextForSafety(questionText);
    if (!safety.safe) {
      reasons.push(`SAFETY_VIOLATION: ${safety.violations.join(', ')}`);
      continue;
    }

    // 5. Closed-form check
    if (isClosedFormQuestion(questionText)) {
      reasons.push('CLOSED_FORM_QUESTION');
      continue;
    }

    validCandidates.push({
      ...c,
      target_field: c.target_field || 'interests',
      target_category: c.target_category || 'Possibilities',
      directional_impact: c.directional_impact || 'medium',
      rationale: c.rationale || '',
      question: safety.sanitizedText,
    });
  }

  if (validCandidates.length === 0) {
    return { accepted: null, selectedQuestion: null, rejectedCount: candidates.length, reasons };
  }

  // Rank and select exactly ONE question:
  // Ranking priority:
  // 1. Contradiction priority (if targeting unresolved contradictions)
  // 2. Impact tier (high > medium > low)
  // 3. Model's natural ordering
  const unresolvedContradictions = Array.isArray(beliefState.contradictions)
    ? beliefState.contradictions.filter((ct) => ct && ct.status === 'unresolved')
    : [];
  const hasUnresolved = unresolvedContradictions.length > 0;

  validCandidates.sort((a, b) => {
    // Check contradiction priority
    if (hasUnresolved) {
      const aTouchesContra = (a.target_field || '').includes('contradiction') || (a.rationale || '').includes('contradiction');
      const bTouchesContra = (b.target_field || '').includes('contradiction') || (b.rationale || '').includes('contradiction');
      if (aTouchesContra && !bTouchesContra) return -1;
      if (!aTouchesContra && bTouchesContra) return 1;
    }

    // Impact tier
    const impactScore = (impact: DirectionalImpact) => {
      if (impact === 'high') return 3;
      if (impact === 'medium') return 2;
      return 1;
    };

    return impactScore(b.directional_impact) - impactScore(a.directional_impact);
  });

  const selected = validCandidates[0] || null;

  return {
    accepted: selected,
    selectedQuestion: selected,
    rejectedCount: candidates.length - validCandidates.length,
    reasons,
  };
}

