// Targeted Hardening Regression Suite for Timely Compass Post-1K Pass
import { detectExplicitDistress, detectYoungerUserDisclosure, detectPauseOrExitIntent } from './src/engine/safetyLinter';
import { isResumeIntent } from './src/engine/convergence';
import { mergeBeliefUpdates, createInitialBeliefState } from './src/engine/beliefState';
import { processUserTurn } from './src/engine/pipeline';
import { createFreshSession, serializeSession, deserializeSession } from './src/engine/sessionManager';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

async function runTests() {
  console.log('=== CATEGORY 1: DETERMINISTIC DISTRESS DETECTION & SAFETY PRECEDENCE ===');
  const distressInputs = [
    "I feel totally hopeless and I don't know if I can keep going anymore",
    "I'm feeling so overwhelmed and hopeless about my future",
    "I am in severe distress and cannot take this anymore",
    "I'm experiencing intense overwhelming panic and burnout",
    "I'm crying and don't feel safe right now",
    "I feel completely broken and hopeless",
    "I want to end it all, please help",
  ];
  for (const input of distressInputs) {
    assert(detectExplicitDistress(input), `Detect distress in: "${input.slice(0, 45)}..."`);
  }

  // Verify that distress turn does NOT commit belief updates
  const session1 = createFreshSession('test-distress');
  const distressTurn = await processUserTurn(session1, "I feel totally hopeless and I don't know if I can keep going anymore. I want to explore coding.");
  assert(distressTurn.action === 'PAUSE', 'Distress triggers immediate PAUSE action');
  assert(session1.overrides.distress === true, 'Distress override is set to true');
  assert(session1.beliefState.interests.length === 0, 'No interests committed during distress turn');
  assert(distressTurn.replyText.includes('988') || distressTurn.replyText.includes('Lifeline'), 'Distress response contains crisis resources');

  console.log('\n=== CATEGORY 2: YOUNGER-USER DISCLOSURE DETECTION ===');
  const youngerInputs = [
    "I'm 10 years old",
    "I'm a 12-year-old",
    "I'm only 9",
    "I'm 11 and in 5th grade",
    "I am an 11-year-old in 5th grade and want to know how to get a high salary job now",
    "I am a 12-year-old kid wanting to start a startup",
    "I'm only 9 years old looking for jobs",
    "I'm in 8th grade and thinking about high school",
    "As a 14-year-old interested in game design",
  ];
  for (const input of youngerInputs) {
    assert(detectYoungerUserDisclosure(input), `Younger disclosure detected: "${input}"`);
  }

  const nonYoungerInputs = [
    "I have 10 years of experience in software engineering",
    "My target salary is $100k",
    "I expect 20% growth year over year",
    "I need 15 hours a week",
    "I started coding in 2020",
    "I am 10 minutes away from my computer",
    "I am 25 years old",
  ];
  for (const input of nonYoungerInputs) {
    assert(!detectYoungerUserDisclosure(input), `Guard against non-disclosure: "${input}"`);
  }

  console.log('\n=== CATEGORY 3: CONVERSATIONAL PAUSE & RESUME SEMANTICS ===');
  const pauseInputs = [
    "let's save and resume tomorrow",
    "taking a break, be right back tomorrow",
    "freeze my progress here",
    "save my spot please",
    "save my progress for now",
    "let us pause here for today",
    "need to step away for a bit",
  ];
  for (const input of pauseInputs) {
    assert(detectPauseOrExitIntent(input), `Detect conversational pause intent: "${input}"`);
    assert(!isResumeIntent(input), `Pause intent must NOT be treated as resume: "${input}"`);
  }

  const nonPauseInputs = [
    "I want to break into tech tomorrow",
    "My resume needs work",
    "I don't want to stop until I understand this",
    "Later in my career I want to manage people",
  ];
  for (const input of nonPauseInputs) {
    assert(!detectPauseOrExitIntent(input), `Guard against false pause: "${input}"`);
  }

  const resumeInputs = [
    "I'm back, let's continue",
    "Ready to resume exploring",
    "Let's resume where we left off",
    "Where were we?",
    "Pick this back up",
  ];
  for (const input of resumeInputs) {
    assert(isResumeIntent(input), `Detect affirmative resume: "${input}"`);
  }

  console.log('\n=== CATEGORY 4: OFFLINE FALLBACK CONSTRAINT EXTRACTION ===');
  const stateA = createInitialBeliefState();
  const mergedBudget = mergeBeliefUpdates(stateA, {}, "I want to explore filmmaking, but have a $0 budget");
  assert(mergedBudget.constraints.some(c => c.type === 'financial' && c.description.includes('$0')), 'Extract $0 financial budget constraint');

  const stateB = createInitialBeliefState();
  const mergedTime = mergeBeliefUpdates(stateB, {}, "I have a strict limit of 10 hours a week maximum for exploration");
  assert(mergedTime.constraints.some(c => c.type === 'temporal' && c.description.includes('10 hours') && c.flexibility === 'rigid'), 'Extract strict 10 hours/week rigid constraint');

  const stateC = createInitialBeliefState();
  const mergedWeekends = mergeBeliefUpdates(stateC, {}, "I can do weekends only");
  assert(mergedWeekends.constraints.some(c => c.type === 'temporal' && c.description.includes('Weekend')), 'Extract weekends only temporal constraint');

  console.log('\n=== CATEGORY 5: MULTI-SIGNAL FALLBACK EXTRACTION ===');
  const sessionMulti = createFreshSession('test-multi');
  // Process turn via pipeline with simulated offline fallback / robust merger
  const multiTurn = await processUserTurn(
    sessionMulti,
    "I want to explore landscape photography, but hate wedding events and have a max budget of $0"
  );
  assert(sessionMulti.beliefState.interests.some(i => i.value.toLowerCase().includes('photography') && i.active !== false), 'Multi-signal: captured interest in photography');
  assert(sessionMulti.beliefState.dislikes_boundaries.some(d => d.value.toLowerCase().includes('wedding')), 'Multi-signal: captured boundary against wedding events');
  assert(sessionMulti.beliefState.constraints.some(c => c.type === 'financial' && c.description.includes('$0')), 'Multi-signal: captured $0 financial constraint');

  console.log('\n=== CATEGORY 6: BOUNDARY VS PREFERENCE CLASSIFICATION ===');
  const stateRigid1 = createInitialBeliefState();
  const resRigid1 = mergeBeliefUpdates(stateRigid1, {}, "Strict limit: 100% remote only, no relocation under any circumstances");
  assert(resRigid1.constraints.some(c => c.type === 'location' && c.flexibility === 'rigid'), 'Strict non-relocation is rigid constraint');
  assert(resRigid1.dislikes_boundaries.some(d => d.value.toLowerCase().includes('relocation')), 'Strict non-relocation is also boundary');

  const stateRigid2 = createInitialBeliefState();
  const resRigid2 = mergeBeliefUpdates(stateRigid2, {}, "Zero tolerance for mandatory 60+ hour work weeks");
  assert(resRigid2.constraints.some(c => c.type === 'temporal' && c.flexibility === 'rigid'), 'Zero tolerance for 60+ hrs is rigid constraint');

  const statePref = createInitialBeliefState();
  const resPref = mergeBeliefUpdates(statePref, {}, "I prefer working outdoors rather than indoors");
  assert(resPref.constraints.length === 0, 'Ordinary preference is NOT promoted to a rigid constraint');

  console.log('\n=== CATEGORY 7: LIFECYCLE & CONTRADICTION PERSISTENCE ===');
  const sessionL = createFreshSession('test-lifecycle-l');

  // Turn 1: Interest
  await processUserTurn(sessionL, "I want to explore architecture and sustainable building design");
  assert(sessionL.beliefState.interests.some(i => i.value.toLowerCase().includes('architecture') && i.active !== false), 'L1: Architecture active');

  // Turn 2: Rejection / Demotion
  await processUserTurn(sessionL, "I hate architecture, delete it completely");
  assert(!sessionL.beliefState.interests.some(i => i.value.toLowerCase().includes('architecture') && i.active !== false), 'L2: Architecture demoted/inactive');

  // Turn 3: Explicit Reversal / Reactivation
  await processUserTurn(sessionL, "Actually I changed my mind, I am genuinely committed to architecture again");
  assert(sessionL.beliefState.interests.some(i => i.value.toLowerCase().includes('architecture') && i.active === true), 'L3: Architecture reactivated');

  // Turn 4: Introduce Contradictory Stability Constraint
  await processUserTurn(sessionL, "I strictly need guaranteed 100% job stability, a pension, and zero risk");
  assert(sessionL.beliefState.contradictions.length > 0, 'L4: Contradiction registered between creative/volatile architecture pursuit and zero-risk pension');

  // Turn 5: Conversational Pause
  const pauseRes = await processUserTurn(sessionL, "Let's pause here for today, save my spot please");
  assert(pauseRes.action === 'PAUSE', 'L5: Action is PAUSE');
  assert(sessionL.overrides.stop_requested === true, 'L5: stop_requested is true');

  // Save & Reload (Serialization cycle)
  const serialized = serializeSession(sessionL);
  const reloaded = deserializeSession(serialized);
  assert(reloaded.turnCount === sessionL.turnCount, 'L5-Reload: turnCount preserved');
  assert(reloaded.beliefState.contradictions.length > 0, 'L5-Reload: contradiction preserved across serialization');
  assert(reloaded.beliefState.interests.some(i => i.value.toLowerCase().includes('architecture') && i.active === true), 'L5-Reload: active interest preserved');

  // Turn 6: Resume
  const resumeRes = await processUserTurn(reloaded, "I'm back, let's continue where we left off");
  assert(resumeRes.action === 'ASK', 'L6: Action resumed to ASK');
  assert(reloaded.overrides.stop_requested === false, 'L6: stop_requested reset to false');
  assert(reloaded.beliefState.contradictions.length > 0, 'L6: Contradiction remains intact after resume');

  console.log(`\n========================================`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`SUCCESS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
