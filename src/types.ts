export type DirectionalConcept = 'Interests' | 'Goals' | 'Possibilities' | 'Constraints' | 'Motivation' | null;

export interface StarterChoice {
  id: string;
  label: string;
  compassAngle: number; // degrees
  prompt: string;
  followUp: string;
  suggestedQuestions: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp?: string;
  conceptTag?: DirectionalConcept;
  choices?: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface DirectionOutcome {
  id: string;
  title: string;
  description: string;
  iconName: string;
}
