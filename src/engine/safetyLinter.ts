// Safety, Guardrails, and Banned-Phrase Linter for Timely Compass

const DIAGNOSIS_PATTERNS = [
  /\b(you suffer from|you have|diagnosed with|clinical|symptoms of|adhd|autism|bipolar|depression|anxiety disorder|neurodivergent condition|personality disorder)\b/i,
  /\b(psychiatric|pathology|therapeutic treatment|medication for)\b/i,
];

const SECRECY_PATTERNS = [
  /\b(don't tell your (parents|family|mom|dad)|hide (this|it) from your (parents|family)|keep it secret from|defy your (parents|family)|go behind their back)\b/i,
  /\b(cut off your family|ignore what your family thinks)\b/i,
];

const VERDICT_PATTERNS = [
  /\b(the only (career|job|path) for you is|you are destined to (be|become)|your true calling is definitely|you must become a|there is only one choice)\b/i,
  /\b(guaranteed (success|salary|wealth|income)|100% certain to fit)\b/i,
  /\b(\$\s?\d{2,3},\d{3}|\b\d{2,3}k\s*(salary|guaranteed))\b/i, // Unsourced specific salary guarantee
];

const DISTRESS_PATTERNS = [
  // 1. Suicidal ideation, self-harm, ending life
  /\b(want to die|kill myself|end it all|suicide|self[- ]harm|no reason to live|can'?t go on anymore|cannot go on anymore|hopeless and want to end|hurt myself|harm myself|end my life|take my own life|hate being alive|better off dead|cutting myself|overdose|no point in living|don'?t want to be here anymore|want to hurt myself)\b/i,
  // 2. Severe hopelessness and inability to keep going / cope
  /\b(feel(?:ing)?\s+(?:totally|completely|so|utterly)?\s*hopeless\s+and\s+(?:i\s+)?(?:don'?t know if i can|cannot|can'?t)\s+(?:keep going|go on|take this|continue))\b/i,
  /\b(don'?t know if i can keep going anymore|cannot keep going anymore|can'?t keep going anymore|cannot go on anymore|can'?t go on anymore)\b/i,
  /\b(feel(?:ing)?\s+(?:so|completely|totally|utterly)\s+(?:overwhelmed|broken|hopeless)\s+and\s+(?:hopeless|broken|overwhelmed))\b/i,
  /\b(feel(?:ing)?\s+(?:completely|totally|utterly)\s+(?:broken|hopeless))\b/i,
  /\b(feel(?:ing)?\s+(?:so|intensely)?\s*overwhelmed\s+and\s+hopeless)\b/i,
  // 3. Severe distress and inability to take pressure / cope
  /\b(in severe distress\b)/i,
  /\b(cannot take this (?:pressure )?anymore|can'?t take this (?:pressure )?anymore|cannot cope anymore|can'?t cope anymore)\b/i,
  // 4. Intense overwhelming panic / mental health crisis
  /\b(intense overwhelming panic|overwhelming panic and burnout|severe panic attack|severe crisis)\b/i,
  // 5. Personal safety crisis / crying distress
  /\b(crying and don'?t feel safe|crying and do not feel safe|don'?t feel safe right now|do not feel safe right now|in immediate danger)\b/i,
];

const PAUSE_INTENT_PATTERNS = [
  // Direct pause phrasing
  /\b(pause|can we pause|let'?s pause|let us pause|pause here|pause for now|pause please|pause session|pause this|please pause)\b/i,
  // Stop / break phrasing
  /\b(stop and take a break|taking a break|take a break|need a break|stop here for today|let us stop here|let'?s stop here|stop for now|break for now|stop this for now|need to stop|have to stop)\b/i,
  // Departure / Leaving phrasing
  /\b(have to go|have to leave|have to head out|gotta go|got to go|gotta run|got to run|need to leave|need to go|need to head out|need to step away|step away for a bit|stepping away|leave right now|leave now|have to run)\b/i,
  // Temporal continuation / Postponement phrasing (including "save and resume tomorrow", "be right back tomorrow", "continue tomorrow")
  /\b((?:let'?s\s+)?(?:save|pause)(?:\s+(?:and|then))?\s+(?:resume|continue|pick\s+this\s+up)\s+(?:tomorrow|later|tonight|next time|another time))\b/i,
  /\b(continue (this )?(later|another time|tomorrow|tonight|next time)|pick this up (later|tomorrow|tonight|another time)|talk later|catch you later|finish (this )?(later|tomorrow|another time)|come back (later|tonight|tomorrow|another time)|return later|return tomorrow|resume tomorrow|resume later|be right back tomorrow|be back tomorrow|back tomorrow)\b/i,
  // Save / Bookmark / Spot / Freeze phrasing
  /\b(save this|save session|save and exit|save my progress|save our progress|bookmark this|save this for now|save for later|save my spot|hold my spot|keep my spot|freeze my progress|freeze our progress|freeze (my )?spot|freeze here)\b/i,
  // Destination / Class / Work transitions
  /\b(heading to (class|work|meeting|an appointment)|going to (class|work|a meeting)|leave for (class|work)|run to class|ride is here)\b/i,
  // Colloquial exit phrasing
  /\b(have something else to do right now|battery is at \d+%|brb|gtg|bye for now|cannot talk right now)\b/i,
];

const NEGATIVE_PAUSE_GUARDS = [
  /\b(don'?t|won'?t|never|cannot|can'?t)\s+(want to\s+)?(stop|pause|quit|give up)\b/i,
  /\b(not going to stop|refuse to stop|without stopping)\b/i,
  /\blater\s+(in life|in my career|in the future|in my life)\b/i,
];

export function detectPauseOrExitIntent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  if (lower.length === 0) return false;

  // Check negative guards to prevent false positives (e.g. "I don't want to stop until I learn this")
  for (const guard of NEGATIVE_PAUSE_GUARDS) {
    if (guard.test(lower)) {
      return false;
    }
  }

  // Exact short commands
  if (/^(pause|pause\.|stop for now|save and exit|save this|save session|exit|brb|gtg|bye for now|save)$/i.test(lower)) {
    return true;
  }

  // Comprehensive semantic pause matching
  for (const pattern of PAUSE_INTENT_PATTERNS) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

export interface SafetyCheckResult {
  safe: boolean;
  violations: string[];
  isDistress: boolean;
  isYoungerUserDisclosure: boolean;
  sanitizedText: string;
}

export function detectExplicitDistress(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return DISTRESS_PATTERNS.some((p) => p.test(text));
}

export function detectYoungerUserDisclosure(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  // 1. Grade-level disclosures (K-12 school students under 18)
  // 1st through 11th grade, elementary, middle school, high school underclassman
  if (
    /\b(in\s+(?:[1-9]|1[0-2])(?:st|nd|rd|th)?\s*grade|(?:[1-9]|1[0-2])(?:st|nd|rd|th)?\s*grader|elementary school|middle school(?:er)?|high school (?:freshman|sophomore|junior))\b/i.test(lower)
  ) {
    return true;
  }

  // 2. Direct age disclosures with "I am" / "I'm" / "my age is"
  // e.g. "I'm a 12-year-old", "I am an 11-year-old kid", "I'm 10 years old", "I'm only 9", "I'm 11 and in 5th grade"
  const agePattern = /\b(?:i am|i'm|im|my age is)\s+(?:an?\s+)?(?:only\s+|just\s+)?(\d{1,2})(?:\s*[- ]year[- ]olds?|\s+years\s+old|\s+and\s+in|\s+kid|\s+child|\s+boy|\s+girl|\b)/i;
  const ageMatch = lower.match(agePattern);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    // Conservative bounds: genuine age disclosure under 18
    if (!isNaN(age) && age >= 5 && age < 18) {
      // Guard against false positives like "I'm 10 minutes away" or "I have 10 years of experience"
      if (!/\b(?:i am|i'm)\s+\d{1,2}\s*(?:%|percent|minutes?|mins?|hours?|days?|weeks?|months?|years?\s+(?:of\s+)?(?:experience|in))\b/i.test(lower)) {
        return true;
      }
    }
  }

  // 3. Hyphenated pattern: e.g. "as a 12-year-old" or "being a 14-year-old"
  const asAgeMatch = lower.match(/\b(?:as|being)\s+an?\s+(\d{1,2})[- ]year[- ]old\b/i);
  if (asAgeMatch) {
    const age = parseInt(asAgeMatch[1], 10);
    if (!isNaN(age) && age >= 5 && age < 18) {
      return true;
    }
  }

  return false;
}

export function lintTextForSafety(rawText: string): SafetyCheckResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      safe: true,
      violations: [],
      isDistress: false,
      isYoungerUserDisclosure: false,
      sanitizedText: '',
    };
  }

  const violations: string[] = [];

  for (const p of DIAGNOSIS_PATTERNS) {
    if (p.test(rawText)) {
      violations.push('DIAGNOSIS_LANGUAGE_DETECTED');
    }
  }

  for (const p of SECRECY_PATTERNS) {
    if (p.test(rawText)) {
      violations.push('FAMILY_SECRECY_COACHING_DETECTED');
    }
  }

  for (const p of VERDICT_PATTERNS) {
    if (p.test(rawText)) {
      violations.push('VERDICT_OR_UNSOURCED_CERTAINTY_DETECTED');
    }
  }

  const isDistress = detectExplicitDistress(rawText);

  let sanitized = rawText;
  if (violations.length > 0) {
    // Sanitize blatant verdict language to humble directional phrasing
    sanitized = sanitized
      .replace(/\bthe only (career|job|path) for you is\b/gi, 'one possible path worth exploring is')
      .replace(/\byou are destined to (be|become)\b/gi, 'you might find meaning as')
      .replace(/\byour true calling is definitely\b/gi, 'a promising direction could be')
      .replace(/\byou must become a\b/gi, 'you might consider exploring')
      .replace(/\bthere is only one choice\b/gi, 'there are several promising avenues');
  }

  return {
    safe: violations.length === 0,
    violations,
    isDistress,
    isYoungerUserDisclosure: false,
    sanitizedText: sanitized,
  };
}

export function getDistressResponse(): string {
  return "I hear how overwhelming and heavy things feel right now. Your safety and well-being are what matter most. Please reach out to someone who can support you right away:\n\n• If you are in the US or Canada, call or text 988 to reach the Suicide & Crisis Lifeline (free, confidential, 24/7).\n• In the UK, call 111 or text SHOUT to 85258.\n• If you are anywhere else, please reach out to your local emergency services or a trusted person, counselor, or doctor.\n\nWe can pause here. Please take care of yourself first.";
}
