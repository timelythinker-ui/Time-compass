// Session-Scoped In-Memory State Store for Timely Compass

import { ExplorationSession } from './types';
import { createInitialBeliefState } from './beliefState';

const sessions = new Map<string, ExplorationSession>();

export function createFreshSession(sessionId: string): ExplorationSession {
  return {
    sessionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: 'OPENING',
    turnCount: 0,
    hardCeiling: 15,
    extensionBudgetUsed: 0,
    overrides: {
      distress: false,
      younger_user: false,
      stop_requested: false,
    },
    beliefState: createInitialBeliefState(),
    history: [
      {
        turn: 0,
        sender: 'compass',
        text: "Welcome to Timely Compass. Take a breath—there's no test score, no rush, and no wrong answers. What's one thing you're curious about or wondering about your future today?",
        action: 'ASK',
        concept: 'Possibilities',
        timestamp: Date.now(),
      },
    ],
  };
}

export function getOrCreateSession(sessionId?: string): ExplorationSession {
  const id = sessionId || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  let session = sessions.get(id);
  if (!session) {
    session = createFreshSession(id);
    sessions.set(id, session);
  }

  // Cleanup old sessions (older than 2 hours) to avoid memory leaks
  const now = Date.now();
  for (const [sId, sess] of sessions.entries()) {
    if (now - sess.updatedAt > 2 * 60 * 60 * 1000) {
      sessions.delete(sId);
    }
  }

  return session;
}

export function saveSession(session: ExplorationSession): void {
  session.updatedAt = Date.now();
  sessions.set(session.sessionId, session);
}

export function resetSession(sessionId: string): ExplorationSession {
  sessions.delete(sessionId);
  const fresh = createFreshSession(sessionId);
  sessions.set(sessionId, fresh);
  return fresh;
}

export function serializeSession(session: ExplorationSession): string {
  return JSON.stringify(session);
}

export function deserializeSession(jsonStr: string): ExplorationSession {
  const parsed = JSON.parse(jsonStr) as ExplorationSession;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid serialized session JSON');
  }
  if (typeof parsed.turnCount !== 'number' || isNaN(parsed.turnCount)) {
    parsed.turnCount = Array.isArray(parsed.history)
      ? Math.max(...parsed.history.map((h) => (typeof h.turn === 'number' ? h.turn : 0)), 0)
      : 0;
  }
  if (!parsed.overrides) {
    parsed.overrides = { distress: false, younger_user: false, stop_requested: false };
  }
  if (!parsed.beliefState) {
    parsed.beliefState = createInitialBeliefState();
  }
  sessions.set(parsed.sessionId, parsed);
  return parsed;
}

