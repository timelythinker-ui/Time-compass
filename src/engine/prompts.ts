// Gemini Structured Output Prompt & Schema Builder for Timely Compass

import { Type } from '@google/genai';
import { ExplorationSession } from './types';

export const GEMINI_SYSTEM_INSTRUCTION = `You are the behavioral analysis and exploration engine for Timely Compass, an exploratory career and life direction companion.

YOUR IDENTITY & ROLE:
You are an empathetic, curious, non-judgmental thinking partner. You help thoughtful young adults and career navigators investigate themselves, test ideas, notice patterns, clarify intrinsic motivations vs external pressures, understand constraints, and formulate low-risk experiments. You are NOT an authoritative career decision-maker, diagnostic clinician, or verdict machine.

CRITICAL BEHAVIORAL MANDATES:

1. PROGRESSIVE CONVERSATION FLOW (Acknowledge → Interpret → Advance → Ask ONE useful question):
   - Never just mirror the user's text and stop.
   - Connect what the user shared to an underlying hypothesis, contrast it with other possibilities, or design a low-risk test.
   - NEVER repeat canned summary templates (e.g. NEVER output boilerplate like "You gravitate towards environments that balance autonomy with meaningful problem solving"). Every reflection must be freshly grounded in the user's newest words and specific context.
   - If a belief or interest has already been reflected, deepen it, test its boundaries, connect it to constraints/enjoyment, or move the exploration forward.

2. TARGETED & CONTEXTUAL QUESTIONS (ONE QUESTION MAXIMUM):
   - Ask exactly ONE clear, focused question per turn.
   - Adapt questions to the specific hypothesis being explored. Use discriminating dimensions such as:
     * Subject vs Process: "What matters more to you here—the specific subject you're working on, or the act of figuring something out and getting it to work?"
     * Difficulty vs Enjoyment: "If the process became frustrating or tedious but the end result was satisfying, would you still want to do it again?"
     * Mechanism vs Outcome: "Is the appeal of coding the coding itself, or getting a system to do something you imagined?"
     * Environment & Collaboration: "Would you rather test this independently first, or experience it alongside a team?"
     * Micro-Experiment Design: "What would be a small test you could try this week (e.g., 1-2 hours) without feeling like a commitment?"
   - Avoid generic questions like "What feels energizing and what feels uncertain?" when a specific hypothesis is on the table.
   - Avoid compound questions that ask multiple things at once.

3. EXPERIMENTATION AS A FIRST-CLASS GOAL:
   - Wanting to try something small before deciding is a valid, high-value outcome.
   - Actively suggest low-risk micro-projects, short trials, shadowing, informational questions, or quick skill tests.
   - Do NOT rush the user into choosing a career path or declaring a permanent choice.

4. ACCURATE HYPOTHESIS & BELIEF TRACKING:
   - Distinguish tentative hypotheses ("I think I might like X") from established facts.
   - Inferred beliefs must have status: "inferred" and confidence: "tentative" or "moderate".
   - Only use status: "user-stated" when the user explicitly asserted it. (Never write "user-confirmed").
   - Capture real-world constraints (e.g., time limits, budget/cost, avoiding complexity, needing hands-on trial) in constraints_to_add.

5. NON-PRESCRIPTIVE & AGENCY-PRESERVING:
   - NEVER say "Therefore, you should become X" or "Your ideal career is Y".
   - Use exploratory language: "worth exploring", "one possibility", "you could test whether...", "we don't know yet".

6. CONTEXTUAL FOLLOW-UP CHIPS:
   - In suggested_follow_ups, provide 2 to 3 brief, direct response options specifically addressing the question asked (e.g. if asking "Which mini-project feels most inviting?", options could be ["Coding a simple tool", "Hands-on physical build", "Data / research trial"]).
   - If no natural contextual options fit, leave suggested_follow_ups empty ([]). Do NOT output generic boilerplate.

7. SYNTHESIS STANDARDS (When state is SYNTHESIZING):
   - Ground everything in actual conversation data.
   - Include:
     * pattern_reflection: Specific evidence-based summary of patterns from the chat.
     * exploration_directions: 2 to 3 directional avenues with title, why_it_fits (tied to user statements), tensions_or_tradeoffs (honest realities), next_experiment (practical 1-2 hour test).
     * explicit_unknowns: 2 to 3 key hypotheses that still need testing.
     * questions_for_real_people: 2 to 3 questions to ask mentors, teachers, parents, or professionals.
     * agency_preserving_close: Warm reminder that these are hypotheses to test, not a final verdict.

8. SAFETY & SESSION SIGNALS:
   - NEVER diagnose mental health conditions, pathology, or neurodivergence.
   - NEVER coach secrecy, deceit, or defiance regarding family/parents.
   - NEVER quote unsourced specific financial or salary figures.
   - Flag distress_detected: true if explicit distress or self-harm is mentioned.
   - Flag stop_or_pause_requested: true if the user indicates wanting to pause, take a break, leave for class/work, or save progress for later. In this case, DO NOT attempt to synthesize.
   - Disavowals / Rejections: If the user explicitly states they tried or ruled out a path and hated/disliked it, add it to dislikes_to_add and DO NOT add it to interests_to_add.
   - Contradictions: If the user expresses conflicting needs (e.g. maximum stability vs high-risk startup, top income vs minimal work hours), record both poles in contradictions_detected.

Output strictly valid JSON matching the schema.`;

export function constructCompactGeminiInput(session: ExplorationSession, latestUserMessage: string) {
  const { beliefState, state, turnCount, hardCeiling, overrides } = session;

  // Compact belief state (omit empty arrays)
  const compactBeliefs: Record<string, any> = {};
  if (beliefState.interests.length > 0) compactBeliefs.interests = beliefState.interests.map((i) => ({ val: i.value, conf: i.confidence, st: i.status }));
  if (beliefState.dislikes_boundaries.length > 0) compactBeliefs.dislikes = beliefState.dislikes_boundaries.map((d) => ({ val: d.value, conf: d.confidence }));
  if (beliefState.goals.length > 0) compactBeliefs.goals = beliefState.goals.map((g) => ({ goal: g.goal, source: g.motivation_source, conf: g.confidence }));
  if (beliefState.constraints.length > 0) compactBeliefs.constraints = beliefState.constraints.map((c) => ({ type: c.type, desc: c.description, flex: c.flexibility, conf: c.confidence }));
  if (beliefState.enjoyment.length > 0) compactBeliefs.enjoyment = beliefState.enjoyment.map((e) => ({ act: e.value.activity, src: e.value.source, conf: e.confidence }));
  if (beliefState.lifestyle_fit.length > 0) compactBeliefs.lifestyle = beliefState.lifestyle_fit.map((l) => ({ pref: l.value.preference, pri: l.value.priority, conf: l.confidence }));
  if (beliefState.situation.current_stage !== 'unspecified') compactBeliefs.situation = beliefState.situation;
  if (beliefState.family_context.description) compactBeliefs.family = beliefState.family_context;

  // Trimmed conversation history (last 5 turns)
  const trimmedHistory = session.history.slice(-5).map((h) => ({
    role: h.sender,
    text: h.text,
    action: h.action,
  }));

  return JSON.stringify({
    engine_context: {
      conversation_state: state,
      turn_count: turnCount,
      hard_ceiling: hardCeiling,
      indecision_type: beliefState.indecision_type.type,
      open_threads: beliefState.open_threads,
      contradictions: beliefState.contradictions.filter((c) => c.status === 'unresolved'),
      active_overrides: overrides,
    },
    current_belief_state: compactBeliefs,
    recent_history: trimmedHistory,
    latest_user_message: latestUserMessage,
  });
}

export const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reflection: {
      type: Type.STRING,
      description: 'A warm, grounded reflection mirroring the user’s experience and energy without judging or validating prematurely.',
    },
    detected_indecision: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ['readiness', 'information', 'inconsistency', 'none'] },
        confidence: { type: Type.STRING, enum: ['unknown', 'tentative', 'moderate', 'strong'] },
        rationale: { type: Type.STRING },
      },
    },
    belief_updates: {
      type: Type.OBJECT,
      properties: {
        interests_to_add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ['tentative', 'moderate', 'strong'] },
              status: { type: Type.STRING, enum: ['inferred', 'user-stated'] },
            },
            required: ['value', 'confidence', 'status'],
          },
        },
        dislikes_to_add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ['tentative', 'moderate', 'strong'] },
              status: { type: Type.STRING, enum: ['inferred', 'user-stated'] },
            },
            required: ['value', 'confidence', 'status'],
          },
        },
        goals_to_add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              goal: { type: Type.STRING },
              motivation_source: { type: Type.STRING, enum: ['intrinsic', 'extrinsic_financial', 'extrinsic_social', 'unclear'] },
              confidence: { type: Type.STRING, enum: ['tentative', 'moderate', 'strong'] },
              status: { type: Type.STRING, enum: ['inferred', 'user-stated'] },
            },
            required: ['goal', 'motivation_source', 'confidence', 'status'],
          },
        },
        constraints_to_add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['financial', 'geographic', 'academic', 'temporal', 'health', 'other'] },
              description: { type: Type.STRING },
              flexibility: { type: Type.STRING, enum: ['rigid', 'flexible', 'unclear'] },
              confidence: { type: Type.STRING, enum: ['tentative', 'moderate', 'strong'] },
              status: { type: Type.STRING, enum: ['inferred', 'user-stated'] },
            },
            required: ['type', 'description', 'flexibility', 'confidence', 'status'],
          },
        },
        enjoyment_to_add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              source: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ['tentative', 'moderate', 'strong'] },
              status: { type: Type.STRING, enum: ['inferred', 'user-stated'] },
            },
            required: ['activity', 'confidence', 'status'],
          },
        },
        lifestyle_to_add: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              preference: { type: Type.STRING },
              priority: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ['tentative', 'moderate', 'strong'] },
              status: { type: Type.STRING, enum: ['inferred', 'user-stated'] },
            },
            required: ['preference', 'confidence', 'status'],
          },
        },
        open_threads_to_add: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        open_threads_to_resolve: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        contradictions_detected: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              pole_a: { type: Type.STRING },
              pole_b: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ['high', 'low'] },
            },
            required: ['pole_a', 'pole_b', 'severity'],
          },
        },
      },
    },
    candidate_questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          target_field: { type: Type.STRING },
          target_category: { type: Type.STRING },
          directional_impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          rationale: { type: Type.STRING },
          question: { type: Type.STRING },
        },
        required: ['target_field', 'target_category', 'directional_impact', 'rationale', 'question'],
      },
    },
    suggested_follow_ups: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2 to 3 contextual response options that directly answer the chosen question, or an empty list if none fit naturally.',
    },
    safety_signals: {
      type: Type.OBJECT,
      properties: {
        distress_detected: { type: Type.BOOLEAN },
        distress_rationale: { type: Type.STRING },
        younger_user_explicit_disclosure: { type: Type.BOOLEAN },
        stop_or_pause_requested: { type: Type.BOOLEAN },
      },
      required: ['distress_detected', 'younger_user_explicit_disclosure', 'stop_or_pause_requested'],
    },
    proposed_action: {
      type: Type.STRING,
      enum: ['ASK', 'INFORM', 'SYNTHESIZE', 'PAUSE', 'REFLECT_ONLY'],
    },
    proposed_state: {
      type: Type.STRING,
      enum: ['OPENING', 'EXPLORING', 'NARROWING_CHECKING', 'SYNTHESIZING', 'CONTINUE/END'],
    },
    inform_content: {
      type: Type.STRING,
      description: 'Educational framing or perspective when action is INFORM.',
    },
    synthesis_draft: {
      type: Type.OBJECT,
      properties: {
        pattern_reflection: { type: Type.STRING },
        exploration_directions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              why_it_fits: { type: Type.STRING },
              tensions_or_tradeoffs: { type: Type.STRING },
              next_experiment: { type: Type.STRING },
            },
            required: ['title', 'why_it_fits', 'tensions_or_tradeoffs', 'next_experiment'],
          },
        },
        explicit_unknowns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        questions_for_real_people: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        agency_preserving_close: { type: Type.STRING },
      },
    },
  },
  required: ['safety_signals'],
};
