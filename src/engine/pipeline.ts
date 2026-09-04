// Main Behavioral Engine Pipeline for Timely Compass (1 structured Gemini call per turn)

import { GoogleGenAI } from '@google/genai';
import {
  ExplorationSession,
  EngineTurnResult,
  GeminiTurnOutput,
  AllowedAction,
  ConversationState,
  SynthesisPayload,
} from './types';
import {
  GEMINI_SYSTEM_INSTRUCTION,
  GEMINI_RESPONSE_SCHEMA,
  constructCompactGeminiInput,
} from './prompts';
import { mergeBeliefUpdates, cleanBeliefValue, isMeaningfulBeliefValue } from './beliefState';
import { filterAndSelectQuestion } from './questionFilter';
import { evaluateConvergence, isResumeIntent } from './convergence';
import {
  lintTextForSafety,
  detectExplicitDistress,
  detectYoungerUserDisclosure,
  detectPauseOrExitIntent,
  getDistressResponse,
} from './safetyLinter';
import { saveSession } from './sessionManager';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

function sanitizeGeminiOutput(raw: any): GeminiTurnOutput {
  if (!raw || typeof raw !== 'object') {
    return {
      reflection: "I hear what you're sharing. Let's take a steady breath and explore this together.",
      safety_signals: {
        distress_detected: false,
        younger_user_explicit_disclosure: false,
        stop_or_pause_requested: false,
      },
      proposed_action: 'ASK',
    };
  }

  const safeSignals = {
    distress_detected: Boolean(raw.safety_signals?.distress_detected),
    younger_user_explicit_disclosure: Boolean(raw.safety_signals?.younger_user_explicit_disclosure),
    stop_or_pause_requested: Boolean(raw.safety_signals?.stop_or_pause_requested),
  };

  const safeUpdates: GeminiTurnOutput['belief_updates'] = {};
  if (raw.belief_updates && typeof raw.belief_updates === 'object') {
    if (Array.isArray(raw.belief_updates.interests_to_add)) {
      safeUpdates.interests_to_add = raw.belief_updates.interests_to_add.filter((i: any) => i && typeof i.value === 'string');
    }
    if (Array.isArray(raw.belief_updates.dislikes_to_add)) {
      safeUpdates.dislikes_to_add = raw.belief_updates.dislikes_to_add.filter((d: any) => d && typeof d.value === 'string');
    }
    if (Array.isArray(raw.belief_updates.goals_to_add)) {
      safeUpdates.goals_to_add = raw.belief_updates.goals_to_add.filter((g: any) => g && typeof g.goal === 'string');
    }
    if (Array.isArray(raw.belief_updates.constraints_to_add)) {
      safeUpdates.constraints_to_add = raw.belief_updates.constraints_to_add.filter((c: any) => c && typeof c.description === 'string');
    }
    if (Array.isArray(raw.belief_updates.enjoyment_to_add)) {
      safeUpdates.enjoyment_to_add = raw.belief_updates.enjoyment_to_add.filter((e: any) => e && typeof e.activity === 'string');
    }
    if (Array.isArray(raw.belief_updates.lifestyle_to_add)) {
      safeUpdates.lifestyle_to_add = raw.belief_updates.lifestyle_to_add.filter((l: any) => l && typeof l.preference === 'string');
    }
    if (Array.isArray(raw.belief_updates.open_threads_to_add)) {
      safeUpdates.open_threads_to_add = raw.belief_updates.open_threads_to_add.filter((t: any) => typeof t === 'string');
    }
    if (Array.isArray(raw.belief_updates.open_threads_to_resolve)) {
      safeUpdates.open_threads_to_resolve = raw.belief_updates.open_threads_to_resolve.filter((t: any) => typeof t === 'string');
    }
    if (Array.isArray(raw.belief_updates.contradictions_detected)) {
      safeUpdates.contradictions_detected = raw.belief_updates.contradictions_detected.filter((c: any) => c && typeof c.pole_a === 'string' && typeof c.pole_b === 'string');
    }
  }

  const safeQuestions = Array.isArray(raw.candidate_questions)
    ? raw.candidate_questions.filter((q: any) => q && typeof q.question === 'string' && q.question.trim().length > 0)
    : [];

  const safeFollowUps = Array.isArray(raw.suggested_follow_ups)
    ? raw.suggested_follow_ups.filter((f: any) => typeof f === 'string')
    : [];

  return {
    reflection: typeof raw.reflection === 'string' ? raw.reflection : undefined,
    safety_signals: safeSignals,
    candidate_questions: safeQuestions,
    suggested_follow_ups: safeFollowUps,
    belief_updates: safeUpdates,
    proposed_action: raw.proposed_action || 'ASK',
    proposed_state: raw.proposed_state || 'EXPLORING',
    inform_content: typeof raw.inform_content === 'string' ? raw.inform_content : undefined,
    synthesis_draft: raw.synthesis_draft && typeof raw.synthesis_draft === 'object' ? raw.synthesis_draft : undefined,
  };
}

function safeParseGeminiJson(rawJson: string): any {
  if (!rawJson || typeof rawJson !== 'string') return null;

  let cleaned = rawJson.trim();
  // Strip markdown codeblocks (```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Try regex extraction of outermost JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err2) {
        console.warn('[GEMINI] Failed regex-extracted JSON parse:', err2);
      }
    }
    return null;
  }
}

async function callGeminiStructuredOutput(
  session: ExplorationSession,
  userMessage: string,
  retryCount: number = 0
): Promise<GeminiTurnOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[ENGINE] No GEMINI_API_KEY set, using rule-based fallback');
    return createRuleBasedFallback(session, userMessage);
  }

  const ai = getAiClient();
  const prompt = constructCompactGeminiInput(session, userMessage);
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const currentModel = models[Math.min(retryCount, models.length - 1)];

  try {
    console.log(`[GEMINI] live model call starting (model: ${currentModel}, turn: ${session.turnCount})...`);
    
    // 5.5s timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API call timed out after 5500ms')), 5500);
    });

    const generatePromise = ai.models.generateContent({
      model: currentModel,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const rawJson = response.text?.trim() || '';
    if (!rawJson) {
      console.warn('[GEMINI] Received empty response from model');
      if (retryCount < 1) return callGeminiStructuredOutput(session, userMessage, retryCount + 1);
      return createRuleBasedFallback(session, userMessage);
    }

    const parsedRaw = safeParseGeminiJson(rawJson);
    if (!parsedRaw) {
      console.warn('[GEMINI] JSON parsing failed for raw model response, falling back to rule-based');
      if (retryCount < 1) return callGeminiStructuredOutput(session, userMessage, retryCount + 1);
      return createRuleBasedFallback(session, userMessage);
    }

    console.log('[GEMINI] live model call completed and parsed successfully');
    return sanitizeGeminiOutput(parsedRaw);
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error(`[GEMINI] Structured output error with model ${currentModel}:`, errMsg);
    
    if (errMsg.includes('timed out') || errMsg.includes('fetch failed') || errMsg.includes('HeadersTimeoutError') || errMsg.includes('ETIMEDOUT') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429')) {
      console.log('[GEMINI] Fast-falling back to intelligent rule-based engine response');
      return createRuleBasedFallback(session, userMessage);
    }

    if (retryCount < 1) {
      console.log('[GEMINI] Retrying with secondary model...');
      return callGeminiStructuredOutput(session, userMessage, retryCount + 1);
    }
    console.log('[GEMINI] Falling back to intelligent rule-based engine response');
    return createRuleBasedFallback(session, userMessage);
  }
}

function generateEvidenceBasedSynthesis(session: ExplorationSession): SynthesisPayload {
  const { beliefState } = session;
  const activeInterests = Array.isArray(beliefState.interests)
    ? beliefState.interests.filter((i) => i && i.active !== false).map((i) => i.value)
    : [];
  const enjoymentList = Array.isArray(beliefState.enjoyment)
    ? beliefState.enjoyment.map((e) => e.value.activity)
    : [];
  const constraintsList = Array.isArray(beliefState.constraints)
    ? beliefState.constraints.map((c) => c.description)
    : [];

  const interestStr = activeInterests.length > 0 ? activeInterests.slice(0, 3).join(', ') : 'exploring where your curiosity leads';
  const enjoymentStr = enjoymentList.length > 0 ? enjoymentList.slice(0, 2).join(' and ') : 'working through challenges hands-on';
  const constraintStr = constraintsList.length > 0 ? constraintsList.slice(0, 2).join(', ') : 'keeping initial experiments low-risk and manageable';

  const patternSummary = `Across our reflection, you've shown clear curiosity around ${interestStr}. When you reflect on what feels most engaging, ${enjoymentStr} stands out as a genuine spark. At the same time, you've identified meaningful boundary conditions—notably ${constraintStr}—which make low-friction, practical testing the most sensible next step.`;

  const primaryDirectionTitle = activeInterests[0] ? `Applied Exploration in ${activeInterests[0]}` : 'Applied Problem Solving & Building';
  const secondaryDirectionTitle = activeInterests[1] ? `Cross-Disciplinary Integration with ${activeInterests[1]}` : 'Exploratory Systems & Hands-On Prototyping';

  return {
    pattern_reflection: patternSummary,
    exploration_directions: [
      {
        title: primaryDirectionTitle,
        why_it_fits: `Directly builds on your stated curiosity around ${activeInterests[0] || 'creating and analyzing'} while allowing you to test whether the day-to-day process resonates.`,
        tensions_or_tradeoffs: 'Requires carving out small dedicated blocks of focus without turning it into high-pressure commitment.',
        next_experiment: `Spend 90 minutes this week doing one tangible micro-project in this area (e.g. building a tiny demo, analyzing a small dataset, or completing a beginner walkthrough).`,
      },
      {
        title: secondaryDirectionTitle,
        why_it_fits: `Connects your interest in ${activeInterests[1] || 'learning new frameworks'} with practical problem solving, giving you a comparative reference point.`,
        tensions_or_tradeoffs: 'Balancing breadth with enough depth to get an accurate feel for the work.',
        next_experiment: `Set up a 15-minute informal chat or informational interview with someone doing this work to ask what their hardest and most rewarding weekday tasks are.`,
      },
    ],
    explicit_unknowns: [
      `Whether you find deeper satisfaction in the subject domain itself or in the general process of troubleshooting and making systems work`,
      `How you prefer to balance solo deep focus versus collaborative team problem solving`,
    ],
    questions_for_real_people: [
      `"When you were first starting out in this field, what was the most surprising difference between what you imagined and what you actually do each day?"`,
      `"What is a small, low-risk project or observation you would suggest to someone wanting to test if they have an aptitude or appetite for this work?"`,
    ],
    agency_preserving_close: 'These directions are hypotheses to test, not career verdicts or permanent labels. You hold the steering wheel, and every small experiment gives you real data about what fits you best.',
  };
}

function createRuleBasedFallback(session: ExplorationSession, userMessage: string): GeminiTurnOutput {
  const lower = userMessage.toLowerCase();
  const isDistress = detectExplicitDistress(userMessage);

  if (isDistress) {
    return {
      safety_signals: {
        distress_detected: true,
        younger_user_explicit_disclosure: false,
        stop_or_pause_requested: false,
      },
      proposed_action: 'PAUSE',
    };
  }

  let conceptKey = 'Possibilities';
  let targetField = 'interests';
  let reflection = `It sounds like you're exploring the space around "${userMessage.slice(0, 50)}". Rather than jumping to a definitive answer, we can treat this as an open hypothesis to test.`;
  let questionText = "When you imagine trying out this path in a low-risk way, what's a first small step you would feel curious to test?";
  let followUps: string[] = ["Try a 1-hour mini project", "Talk to someone in the field", "Compare it with another interest"];

  let interestUpdateVal: string | null = null;
  let dislikeUpdateVal: string | null = null;
  const constraintUpdates: Array<{
    type: 'temporal' | 'financial' | 'location' | 'qualification' | 'other';
    description: string;
    flexibility: 'rigid' | 'negotiable' | 'flexible';
    confidence: 'strong' | 'tentative';
    status: 'user-stated' | 'inferred';
  }> = [];

  // Multi-signal extraction: 1. Explicit Interest
  const explicitInterestMatch = userMessage.match(/\b(?:i want to explore|i'?m curious about|i love|i really love|i enjoy|interested in|passionate about|curious about|drawn to|want to pursue)\s+([a-zA-Z0-9 &/-]+?)(?:[.,;!?]|\s+(?:and|but|however|with|having)|$)/i);
  if (explicitInterestMatch) {
    const rawVal = explicitInterestMatch[1].trim();
    if (isMeaningfulBeliefValue(rawVal) && !/\b(hate|hated|not for me|can'?t stand)\b/i.test(rawVal)) {
      interestUpdateVal = cleanBeliefValue(rawVal) || rawVal;
    }
  }

  // Multi-signal extraction: 2. Explicit Dislike / Boundary
  const explicitDislikeMatch = userMessage.match(/\b(?:hate|dislike|can'?t stand|refuse to do|avoid)\s+([a-zA-Z0-9 &/-]+?)(?:[.,;!?]|\s+(?:and|but|however|with|having)|$)/i);
  if (explicitDislikeMatch) {
    const rawDis = explicitDislikeMatch[1].trim();
    if (isMeaningfulBeliefValue(rawDis)) {
      dislikeUpdateVal = cleanBeliefValue(rawDis) || rawDis;
    }
  }

  // Multi-signal extraction: 3. Budget / Financial Constraints
  if (/(?:^|\W)(?:\$0|₹0|€0|£0|0 dollars|zero budget|no money|cannot spend money|no budget|free only|broke|cannot afford|no funds|no credit card|max budget of \$?0|budget of \$?0|\$0 budget)\b/i.test(lower)) {
    constraintUpdates.push({
      type: 'financial',
      description: 'Zero financial budget ($0 / free exploration only)',
      flexibility: 'rigid',
      confidence: 'strong',
      status: 'user-stated',
    });
  }

  // Multi-signal extraction: 4. Temporal Constraints
  const timeMatch = lower.match(/(?:(?:strict limit|ceiling|limit|max(?:imum)?)\s*[:]?\s*)?(\d{1,2})\s*(?:hours?|hrs?)(?:\s*(?:a|per)\s*week)?/i) ||
    lower.match(/(\d{1,2})\s*(?:hours?|hrs?)\s*(?:a|per)\s*week/i);
  if (timeMatch && !lower.includes('$') && !lower.includes('%')) {
    const hours = parseInt(timeMatch[1], 10);
    if (!isNaN(hours) && hours > 0 && hours <= 80) {
      constraintUpdates.push({
        type: 'temporal',
        description: `Time ceiling: maximum ${hours} hours per week`,
        flexibility: /strict|max|limit|ceiling|rigid|zero tolerance/i.test(lower) ? 'rigid' : 'flexible',
        confidence: 'strong',
        status: 'user-stated',
      });
    }
  } else if (/\b(weekends? only|only on weekends?)\b/i.test(lower)) {
    constraintUpdates.push({
      type: 'temporal',
      description: 'Weekend exploration only',
      flexibility: 'rigid',
      confidence: 'strong',
      status: 'user-stated',
    });
  }

  // Differentiate discriminating hypotheses
  if (lower.includes('code') || lower.includes('programming') || lower.includes('software') || lower.includes('tech')) {
    conceptKey = 'Interests';
    targetField = 'enjoyment';
    reflection = "You mentioned an interest around technology and building. One key distinction is whether you enjoy the mechanics of coding itself, or the outcome of getting a system to do something you imagined.";
    questionText = "Is the appeal more about the puzzle of programming itself, or creating a tangible tool that solves a specific problem?";
    followUps = ["The puzzle of programming", "Building something tangible", "Both equally", "Not sure yet"];
    if (!interestUpdateVal && !/\b(hate|hated|not for me|can'?t stand)\b/i.test(lower)) {
      interestUpdateVal = 'Software & Technology';
    }
  } else if (lower.includes('experiment') || lower.includes('small') || lower.includes('project') || lower.includes('test')) {
    conceptKey = 'Possibilities';
    targetField = 'constraints';
    reflection = "Treating this as a low-risk trial is a smart way to gain real clarity without making a heavy commitment.";
    questionText = "What would be small enough to try this week (say, 1 to 2 hours) without feeling like a burden or high pressure?";
    followUps = ["A hands-on mini build", "Watching a real practitioner's day", "Reading real case studies"];
  } else if (lower.includes('stuck') || lower.includes('fear') || lower.includes('pressure') || lower.includes('money') || lower.includes('cost') || lower.includes('time')) {
    conceptKey = 'Constraints';
    targetField = 'constraints';
    reflection = "Acknowledging real-world constraints early is essential—it helps us shape experiments that fit your actual life.";
    questionText = "What feels like the biggest tension right now—is it limited time, financial considerations, or not knowing where to start?";
    followUps = ["Limited free time", "Financial considerations", "Not knowing where to start"];
  } else if (lower.includes('bio') || lower.includes('science') || lower.includes('art') || lower.includes('design') || lower.includes('business')) {
    conceptKey = 'Interests';
    targetField = 'interests';
    reflection = "Having curiosity across distinct areas is a major strength. Often the sweet spot lies at the intersection rather than forcing an immediate either/or choice.";
    questionText = "What is the specific spark that draws you to each of these—is it understanding how things work, or creating something new?";
    followUps = ["Understanding how things work", "Creating something new", "Helping people directly"];
    if (!interestUpdateVal) {
      const cleaned = cleanBeliefValue(userMessage);
      if (cleaned) interestUpdateVal = cleaned;
    }
  }

  const beliefUpdates: GeminiTurnOutput['belief_updates'] = {};
  if (interestUpdateVal) {
    beliefUpdates.interests_to_add = [{ value: interestUpdateVal, confidence: 'strong', status: 'user-stated' }];
  }
  if (dislikeUpdateVal) {
    beliefUpdates.dislikes_to_add = [{ value: dislikeUpdateVal, confidence: 'strong', status: 'user-stated' }];
  }
  if (constraintUpdates.length > 0) {
    beliefUpdates.constraints_to_add = constraintUpdates;
  }

  return {
    reflection,
    safety_signals: {
      distress_detected: false,
      younger_user_explicit_disclosure: detectYoungerUserDisclosure(userMessage),
      stop_or_pause_requested: false,
    },
    candidate_questions: [
      {
        target_field: targetField,
        target_category: conceptKey,
        directional_impact: 'high',
        rationale: 'Deepens exploration along key user interest using progressive discrimination without prescribing.',
        question: questionText,
      },
    ],
    suggested_follow_ups: followUps,
    belief_updates: beliefUpdates,
    proposed_action: 'ASK',
    proposed_state: session.turnCount >= 2 ? 'EXPLORING' : 'OPENING',
  };
}

export async function processUserTurn(
  session: ExplorationSession,
  userMessage: string
): Promise<EngineTurnResult> {
  const cleanInput = (userMessage || '').trim();

  // -------------------------------------------------------------
  // 1. PRE-TURN CRISIS / DISTRESS INTERCEPTION (Instant, Zero LLM Call)
  // -------------------------------------------------------------
  const inputDistress = detectExplicitDistress(cleanInput);
  if (inputDistress || (session.overrides.distress && !cleanInput.toLowerCase().includes('better') && !cleanInput.toLowerCase().includes('calm'))) {
    session.overrides.distress = true;
    session.turnCount += 1;
    session.history.push({
      turn: session.turnCount,
      sender: 'user',
      text: cleanInput,
      timestamp: Date.now(),
    });

    const distressMsg = getDistressResponse();
    session.history.push({
      turn: session.turnCount,
      sender: 'compass',
      text: distressMsg,
      action: 'PAUSE',
      timestamp: Date.now(),
    });
    saveSession(session);

    return {
      sessionId: session.sessionId,
      turn: session.turnCount,
      state: session.state,
      action: 'PAUSE',
      replyText: distressMsg,
      conceptOrientation: 'Constraints',
      suggestedFollowUps: [],
      activeThreads: session.beliefState.open_threads,
      unresolvedContradictionsCount: 0,
    };
  }

  // Check younger user disclosure
  if (detectYoungerUserDisclosure(cleanInput)) {
    session.overrides.younger_user = true;
  }

  // -------------------------------------------------------------
  // 2. PRE-TURN PAUSE / EXIT INTERCEPTION (Instant Bookmark, Zero LLM Call, Absolute Priority)
  // -------------------------------------------------------------
  if (isResumeIntent(cleanInput)) {
    session.overrides.stop_requested = false;
  } else if (detectPauseOrExitIntent(cleanInput) || session.overrides.stop_requested) {
    session.overrides.stop_requested = true;
    session.history.push({
      turn: session.turnCount,
      sender: 'user',
      text: cleanInput,
      timestamp: Date.now(),
    });

    // Commit any evidence / preferences / boundaries in the pause utterance before freezing state
    session.beliefState = mergeBeliefUpdates(session.beliefState, {}, cleanInput);

    const pauseMsg =
      "I've saved our conversation and bookmarked your exploration state right here. Whenever you're ready to pick this back up, we can jump straight in where we left off. Take care!";

    session.history.push({
      turn: session.turnCount,
      sender: 'compass',
      text: pauseMsg,
      action: 'PAUSE',
      concept: 'Possibilities',
      timestamp: Date.now(),
    });

    saveSession(session);

    return {
      sessionId: session.sessionId,
      turn: session.turnCount,
      state: session.state,
      action: 'PAUSE',
      replyText: pauseMsg,
      conceptOrientation: 'Possibilities',
      suggestedFollowUps: ["I'm back, let's continue", "Review what we explored so far"],
      activeThreads: session.beliefState.open_threads,
      unresolvedContradictionsCount: Array.isArray(session.beliefState.contradictions)
        ? session.beliefState.contradictions.filter((c) => c && c.status === 'unresolved').length
        : 0,
    };
  }

  // -------------------------------------------------------------
  // 3. Append User Message to History & Increment Turn Count
  // -------------------------------------------------------------
  session.turnCount += 1;
  session.history.push({
    turn: session.turnCount,
    sender: 'user',
    text: cleanInput,
    timestamp: Date.now(),
  });

  // -------------------------------------------------------------
  // 4. ONE Gemini Structured Output Call
  // -------------------------------------------------------------
  let geminiOutput = await callGeminiStructuredOutput(session, cleanInput);

  // If Gemini output failed completely after retry: safe REFLECT_ONLY fallback
  if (!geminiOutput) {
    geminiOutput = {
      reflection: "I hear what you're sharing. Let's take a steady breath and look at how this fits into your overall direction.",
      safety_signals: {
        distress_detected: false,
        younger_user_explicit_disclosure: false,
        stop_or_pause_requested: false,
      },
      proposed_action: 'REFLECT_ONLY',
    };
  }

  // Update overrides from model safety signals
  if (geminiOutput.safety_signals?.distress_detected || session.overrides.distress) {
    session.overrides.distress = true;
    const distressMsg = getDistressResponse();
    session.history.push({
      turn: session.turnCount,
      sender: 'compass',
      text: distressMsg,
      action: 'PAUSE',
      timestamp: Date.now(),
    });
    saveSession(session);
    return {
      sessionId: session.sessionId,
      turn: session.turnCount,
      state: session.state,
      action: 'PAUSE',
      replyText: distressMsg,
      conceptOrientation: 'Constraints',
      suggestedFollowUps: [],
      activeThreads: session.beliefState.open_threads,
      unresolvedContradictionsCount: 0,
    };
  }

  if (geminiOutput.safety_signals?.younger_user_explicit_disclosure) {
    session.overrides.younger_user = true;
  }
  if (geminiOutput.safety_signals?.stop_or_pause_requested) {
    session.overrides.stop_requested = true;
  }

  // -------------------------------------------------------------
  // 5. Mandatory Deterministic Post-LLM Belief Merge & Sanitization
  // -------------------------------------------------------------
  console.log(`[ENGINE] deterministic processing (turn: ${session.turnCount}, input: "${cleanInput.slice(0, 40)}...")`);
  session.beliefState = mergeBeliefUpdates(
    session.beliefState,
    geminiOutput.belief_updates,
    cleanInput
  );

  // -------------------------------------------------------------
  // 6. 7-Step Deterministic Convergence Check
  // -------------------------------------------------------------
  const convergence = evaluateConvergence(session, cleanInput, geminiOutput.safety_signals);
  session.state = convergence.nextState;
  console.log(`[ENGINE] convergence evaluated -> state: ${session.state}, action: ${convergence.action}, trigger: ${convergence.trigger}`);

  // Handle Distress Override immediately
  if (convergence.trigger === 'DISTRESS_OVERRIDE' || session.overrides.distress) {
    const distressMsg = getDistressResponse();
    session.history.push({
      turn: session.turnCount,
      sender: 'compass',
      text: distressMsg,
      action: 'PAUSE',
      timestamp: Date.now(),
    });
    saveSession(session);

    return {
      sessionId: session.sessionId,
      turn: session.turnCount,
      state: session.state,
      action: 'PAUSE',
      replyText: distressMsg,
      conceptOrientation: 'Constraints',
      suggestedFollowUps: [],
      activeThreads: session.beliefState.open_threads,
      unresolvedContradictionsCount: 0,
    };
  }

  // -------------------------------------------------------------
  // 7. Question Candidate Filtering and Selection (Order: malformed -> redundant -> guardrail -> closed-form)
  // -------------------------------------------------------------
  const lastQuestion = session.history
    .slice()
    .reverse()
    .find((h) => h.sender === 'compass' && h.action === 'ASK')?.text;

  const questionResult = filterAndSelectQuestion(
    geminiOutput.candidate_questions,
    session.beliefState,
    lastQuestion
  );

  const chosenQuestion = questionResult.accepted;

  // -------------------------------------------------------------
  // 8. Determine Final Action (Deterministic Precedence)
  // -------------------------------------------------------------
  let finalAction: AllowedAction = convergence.action;

  // If convergence called for ASK but 0 questions survived, fallback to REFLECT_ONLY
  if (finalAction === 'ASK' && !chosenQuestion) {
    finalAction = 'REFLECT_ONLY';
  }

  // -------------------------------------------------------------
  // 9. Assemble Reply Text & Synthesis Payload (Strict Single-Question Discipline)
  // -------------------------------------------------------------
  let reflectionText = geminiOutput.reflection?.trim() || '';
  if (reflectionText) {
    const lintedRef = lintTextForSafety(reflectionText);
    reflectionText = lintedRef.sanitizedText;
  }

  // Ensure reflection does not end in a question mark if an ASK action is appending a question
  if (finalAction === 'ASK' && reflectionText.includes('?')) {
    reflectionText = reflectionText.replace(/\?/g, '.').replace(/\.{2,}/g, '.');
  }

  let finalReplyText = '';
  let synthesisPayload: SynthesisPayload | undefined = undefined;

  if (finalAction === 'SYNTHESIZE' || convergence.forceSynthesis) {
    finalAction = 'SYNTHESIZE';
    session.state = 'SYNTHESIZING';

    // Strip questions from reflection on synthesis
    if (reflectionText.includes('?')) {
      reflectionText = reflectionText.replace(/\?/g, '.').replace(/\.{2,}/g, '.');
    }

    // Build or sanitize synthesis
    if (geminiOutput.synthesis_draft && Array.isArray(geminiOutput.synthesis_draft.exploration_directions) && geminiOutput.synthesis_draft.exploration_directions.length > 0) {
      synthesisPayload = {
        pattern_reflection: lintTextForSafety(geminiOutput.synthesis_draft.pattern_reflection || '').sanitizedText,
        exploration_directions: geminiOutput.synthesis_draft.exploration_directions.slice(0, 4).map((d) => ({
          title: lintTextForSafety(d.title || '').sanitizedText,
          why_it_fits: lintTextForSafety(d.why_it_fits || '').sanitizedText,
          tensions_or_tradeoffs: lintTextForSafety(d.tensions_or_tradeoffs || '').sanitizedText,
          next_experiment: lintTextForSafety(d.next_experiment || '').sanitizedText,
        })),
        explicit_unknowns: Array.isArray(geminiOutput.synthesis_draft.explicit_unknowns) ? geminiOutput.synthesis_draft.explicit_unknowns : [],
        questions_for_real_people: Array.isArray(geminiOutput.synthesis_draft.questions_for_real_people)
          ? geminiOutput.synthesis_draft.questions_for_real_people
          : [
              'What does a typical Tuesday afternoon look like in this role?',
              'What is one project you would recommend doing to test if I enjoy this work?',
            ],
        agency_preserving_close: lintTextForSafety(
          geminiOutput.synthesis_draft.agency_preserving_close ||
            'These directions are starting hypotheses to explore, not final career verdicts. You hold the steering wheel.'
        ).sanitizedText,
      };
    } else {
      // Evidence-based dynamic synthesis fallback
      synthesisPayload = generateEvidenceBasedSynthesis(session);
    }

    finalReplyText = `${reflectionText ? reflectionText + '\n\n' : ''}Here is a synthesis of the key patterns and directions emerging from our reflection:\n\n${synthesisPayload.pattern_reflection}`;
  } else if (finalAction === 'INFORM') {
    const inform = geminiOutput.inform_content ? lintTextForSafety(geminiOutput.inform_content).sanitizedText : '';
    finalReplyText = `${reflectionText ? reflectionText + '\n\n' : ''}${inform || 'Here is some perspective to consider as you think about next steps.'}`;
  } else if (finalAction === 'ASK') {
    finalReplyText = reflectionText
      ? `${reflectionText}\n\n${chosenQuestion?.question}`
      : chosenQuestion?.question || 'What is on your mind regarding this direction?';
  } else {
    // REFLECT_ONLY or PAUSE
    finalReplyText = reflectionText || "I'm listening and taking in what you shared. Take your time to reflect.";
  }

  // -------------------------------------------------------------
  // 10. Concept Orientation Mapping for UI Compass
  // -------------------------------------------------------------
  let conceptOrientation: 'Interests' | 'Goals' | 'Possibilities' | 'Constraints' | 'Motivation' = 'Possibilities';
  if (chosenQuestion) {
    const cat = (chosenQuestion.target_category || '').toLowerCase();
    const field = (chosenQuestion.target_field || '').toLowerCase();
    if (cat.includes('interest') || field.includes('interest')) conceptOrientation = 'Interests';
    else if (cat.includes('goal') || field.includes('goal')) conceptOrientation = 'Goals';
    else if (cat.includes('constraint') || field.includes('constraint')) conceptOrientation = 'Constraints';
    else if (cat.includes('motivat') || field.includes('enjoyment')) conceptOrientation = 'Motivation';
  }

  // Generate dynamic contextual follow-up starter pills (Avoid generic filler)
  let followUps: string[] = [];
  if (finalAction === 'ASK') {
    if (geminiOutput.suggested_follow_ups && geminiOutput.suggested_follow_ups.length > 0) {
      followUps = geminiOutput.suggested_follow_ups.slice(0, 3);
    } else if (chosenQuestion) {
      const qLower = chosenQuestion.question.toLowerCase();
      if (qLower.includes('subject') || qLower.includes('puzzle') || qLower.includes('coding') || qLower.includes('process')) {
        followUps = ['The problem-solving process', 'The subject matter itself', 'Both matter equally'];
      } else if (qLower.includes('experiment') || qLower.includes('micro') || qLower.includes('test') || qLower.includes('week')) {
        followUps = ['Try a 1-hour project', 'Talk to a practitioner', 'Explore introductory resources'];
      } else if (qLower.includes('team') || qLower.includes('solo') || qLower.includes('independently') || qLower.includes('alongside')) {
        followUps = ['Independent deep focus', 'Collaborating closely with others', 'A balance of both'];
      } else if (qLower.includes('tension') || qLower.includes('limitation') || qLower.includes('constraint') || qLower.includes('time') || qLower.includes('cost')) {
        followUps = ['Time commitments', 'Financial considerations', 'Fear of choosing wrong'];
      }
    }
  }

  // -------------------------------------------------------------
  // 11. Append Compass Response to session history and save
  // -------------------------------------------------------------
  session.history.push({
    turn: session.turnCount,
    sender: 'compass',
    text: finalReplyText,
    action: finalAction,
    concept: conceptOrientation,
    timestamp: Date.now(),
  });

  saveSession(session);

  return {
    sessionId: session.sessionId,
    turn: session.turnCount,
    state: session.state,
    action: finalAction,
    replyText: finalReplyText,
    reflection: reflectionText,
    question: finalAction === 'ASK' ? chosenQuestion?.question : undefined,
    synthesis: synthesisPayload,
    conceptOrientation,
    suggestedFollowUps: followUps,
    activeThreads: session.beliefState.open_threads,
    unresolvedContradictionsCount: Array.isArray(session.beliefState.contradictions)
      ? session.beliefState.contradictions.filter((c) => c && c.status === 'unresolved').length
      : 0,
    debugSnapshot: {
      indecisionType: session.beliefState.indecision_type?.type || 'none',
      interestsCount: Array.isArray(session.beliefState.interests)
        ? session.beliefState.interests.filter((i) => i && i.active !== false).length
        : 0,
      goalsCount: Array.isArray(session.beliefState.goals) ? session.beliefState.goals.length : 0,
      constraintsCount: Array.isArray(session.beliefState.constraints) ? session.beliefState.constraints.length : 0,
    },
  };
}

