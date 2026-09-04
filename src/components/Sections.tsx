import React, { useState } from 'react';
import { ArrowRight, ChevronDown, Compass, ShieldAlert, Users, MessageSquare } from 'lucide-react';
import { ModernCompass } from './ModernCompass';
import { FaqItem } from '../types';

/* -------------------------------------------------------------
   1. WHAT IS TIMELY COMPASS?
   ------------------------------------------------------------- */
export const WhatIsSection: React.FC = () => {
  return (
    <section id="what-is" className="py-20 sm:py-28 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3478F6] dark:text-[#4C8DFF] mb-3">
          WHAT IS TIMELY COMPASS?
        </p>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-slate-900 dark:text-slate-100 font-display mb-12 max-w-2xl mx-auto leading-snug">
          A conversation to help you find your direction.
        </h2>

        {/* Understand → Explore → Synthesize */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
          <div className="w-full sm:flex-1 py-4 px-5 rounded-xl bg-white dark:bg-[#162235] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            Understand
          </div>
          <span className="text-slate-400 dark:text-slate-600 font-light text-lg hidden sm:inline">→</span>
          <span className="text-slate-400 dark:text-slate-600 font-light text-sm sm:hidden">↓</span>

          <div className="w-full sm:flex-1 py-4 px-5 rounded-xl bg-white dark:bg-[#162235] border border-blue-200/80 dark:border-blue-900/60 text-[#3478F6] dark:text-[#4C8DFF] text-sm font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            Explore
          </div>
          <span className="text-slate-400 dark:text-slate-600 font-light text-lg hidden sm:inline">→</span>
          <span className="text-slate-400 dark:text-slate-600 font-light text-sm sm:hidden">↓</span>

          <div className="w-full sm:flex-1 py-4 px-5 rounded-xl bg-white dark:bg-[#162235] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            Synthesize
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   2. WHY IT IS DIFFERENT
   ------------------------------------------------------------- */
export const WhyDifferentSection: React.FC = () => {
  return (
    <section id="why-different" className="py-20 sm:py-28 bg-[#EDF2F9]/50 dark:bg-[#101827]/60 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 text-center">
          WHY IT IS DIFFERENT
        </p>

        {/* Large typography statement */}
        <div className="text-center space-y-1 mb-14">
          <h2 className="text-2xl sm:text-4xl font-normal text-slate-900 dark:text-slate-100 font-display">
            Not a test.
          </h2>
          <h2 className="text-2xl sm:text-4xl font-normal text-slate-400 dark:text-slate-500 font-display">
            Not a career verdict.
          </h2>
          <h2 className="text-2xl sm:text-4xl font-medium text-[#3478F6] dark:text-[#4C8DFF] font-display">
            A conversation.
          </h2>
        </div>

        {/* Brief Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
          {/* Traditional Quiz */}
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-[#141F30]/60 border border-slate-200 dark:border-slate-800/80">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Traditional Quiz
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fixed questions → Fixed answers → Fixed result
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-normal">
              Forces you into a predetermined job category based on multiple-choice constraints.
            </p>
          </div>

          {/* Timely Compass */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#162235] border border-blue-200/90 dark:border-blue-900/60 shadow-sm">
            <p className="text-xs font-semibold text-[#3478F6] dark:text-[#4C8DFF] uppercase tracking-wider mb-2">
              Timely Compass
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Conversation → Exploration → Synthesis
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-normal">
              Listens to your nuances, adapts to your uncertainties, and helps clarify what matters.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   3. HOW IT WORKS
   ------------------------------------------------------------- */
export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3478F6] dark:text-[#4C8DFF] mb-3">
          HOW IT WORKS
        </p>

        <h2 className="text-2xl sm:text-3xl font-normal text-slate-900 dark:text-slate-100 font-display mb-12">
          From an open thought to a clear orientation.
        </h2>

        {/* Directional Flow connected to subtle compass visual */}
        <div className="relative py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
            
            <div className="w-full md:w-1/4 p-4 rounded-xl bg-white dark:bg-[#162235] border border-slate-200/80 dark:border-slate-800 text-left">
              <span className="text-xs font-mono text-[#3478F6] dark:text-[#4C8DFF] font-semibold">01</span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">Start Talking</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Share any curiosity, worry, or interest without structure.</p>
            </div>

            <span className="text-slate-300 dark:text-slate-700 hidden md:inline text-xl">→</span>

            <div className="w-full md:w-1/4 p-4 rounded-xl bg-white dark:bg-[#162235] border border-slate-200/80 dark:border-slate-800 text-left">
              <span className="text-xs font-mono text-[#20B8A6] dark:text-[#25C7B3] font-semibold">02</span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">Explore</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Test ideas, uncover unseen angles, and compare paths.</p>
            </div>

            <span className="text-slate-300 dark:text-slate-700 hidden md:inline text-xl">→</span>

            <div className="w-full md:w-1/4 p-4 rounded-xl bg-white dark:bg-[#162235] border border-slate-200/80 dark:border-slate-800 text-left">
              <span className="text-xs font-mono text-[#3478F6] dark:text-[#4C8DFF] font-semibold">03</span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">Narrow Possibilities</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Weigh real trade-offs and clarify what fits you.</p>
            </div>

            <span className="text-slate-300 dark:text-slate-700 hidden md:inline text-xl">→</span>

            <div className="w-full md:w-1/4 p-4 rounded-xl bg-white dark:bg-[#162235] border border-blue-200/90 dark:border-blue-900/70 text-left shadow-sm">
              <span className="text-xs font-mono text-[#3478F6] dark:text-[#4C8DFF] font-semibold">04</span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">Understand Your Direction</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Take away tangible next questions and perspectives.</p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   4. WHAT YOU GET
   ------------------------------------------------------------- */
export const WhatYouGetSection: React.FC = () => {
  const outcomes = [
    {
      title: 'A clearer picture of what matters to you',
      desc: 'Identify the underlying values, work rhythms, and problems you care about, rather than just job titles.',
    },
    {
      title: 'Directions worth exploring',
      desc: 'Concrete pathways and domains matched to your strengths, without locking you into premature commitments.',
    },
    {
      title: 'Trade-offs and uncertainties to think about',
      desc: 'Honest perspectives on what each path involves—education lengths, day-to-day realities, and potential drawbacks.',
    },
    {
      title: 'Questions you can take to people you trust',
      desc: 'Clear, grounded questions to discuss with teachers, mentors, parents, and working professionals.',
    },
  ];

  return (
    <section id="what-you-get" className="py-20 sm:py-28 bg-[#EDF2F9]/50 dark:bg-[#101827]/60 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3478F6] dark:text-[#4C8DFF] mb-3">
          WHAT YOU GET
        </p>

        <h2 className="text-2xl sm:text-3xl font-normal text-slate-900 dark:text-slate-100 font-display mb-12">
          Clarity you can actually use.
        </h2>

        {/* Clean list with subtle dividers — NOT a giant card grid */}
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 mb-12">
          {outcomes.map((item, idx) => (
            <div key={idx} className="py-6 sm:py-7 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-8">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 sm:w-1/2">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 sm:w-1/2 leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Small Restrained Editorial-Style Artifact: Direction Snapshot (Illustrative Example) */}
        <div className="mt-8 pt-8 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#162235] border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
            
            {/* Top Label & Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3478F6] dark:bg-[#4C8DFF]" />
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 font-display">
                    Direction Snapshot
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Synthesized session takeaway
                </p>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#111A29] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                Illustrative example
              </span>
            </div>

            {/* Editorial Content Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
              {/* Section 1: What seems to matter */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  What seems to matter
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#3478F6] dark:text-[#4C8DFF] font-medium border border-blue-200/60 dark:border-blue-900/60">
                    Creativity
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/40 text-[#20B8A6] dark:text-[#25C7B3] font-medium border border-teal-200/60 dark:border-teal-900/60">
                    Flexibility
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                    Helping others
                  </span>
                </div>
              </div>

              {/* Section 2: Worth exploring */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Worth exploring
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                    <span className="text-[#3478F6] dark:text-[#4C8DFF] shrink-0">→</span>
                    <span>Human-Centered Technology & Design</span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                    <span className="text-[#20B8A6] dark:text-[#25C7B3] shrink-0">→</span>
                    <span>Educational Systems & Psychology</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Questions to take with you */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Questions to take with you
                </p>
                <p className="text-xs sm:text-sm italic text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                  “What would I actually enjoy doing day-to-day, and who in my school or network could I ask about this path?”
                </p>
              </div>
            </div>

            {/* Reassuring Footer Disclaimer */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              * Illustrative example showing what a session takeaway looks like. You can download your own synthesis after any conversation.
            </p>

          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   5. RESPONSIBLE AI
   ------------------------------------------------------------- */
export const ResponsibleAiSection: React.FC = () => {
  return (
    <section id="responsible-ai" className="py-20 sm:py-28 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#162235] border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldAlert className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>RESPONSIBLE EXPLORATION</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-normal text-slate-900 dark:text-slate-100 font-display mb-4">
            AI can be wrong.
          </h2>

          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            <p>
              Timely Compass can misunderstand nuance, reflect biases, or make factual mistakes. It is an exploration companion and structured sounding board—not a professional career counselor, psychologist, or final authority.
            </p>
            <p>
              We strongly encourage discussing any important directional thoughts with family, trusted teachers, school counselors, or experienced mentors who know you personally.
            </p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 pt-2">
              You stay in control.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   6. ABOUT TIMELY THINKER
   ------------------------------------------------------------- */
export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-16 sm:py-24 bg-[#EDF2F9]/50 dark:bg-[#101827]/60 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
          ABOUT
        </p>

        <h2 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-slate-100 font-display mb-4">
          Built by Timely Thinker.
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed mb-6 font-normal">
          Timely Compass was created through human product thinking, behavioral design and experimentation with multiple AI tools.
        </p>

        {/* Subtle Tools Mention */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
          <span>ChatGPT</span>
          <span>·</span>
          <span>Claude</span>
          <span>·</span>
          <span>Gemini</span>
          <span>·</span>
          <span>Google AI Studio</span>
        </div>

        <a
          href="#faq"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#3478F6] dark:text-[#4C8DFF] hover:underline"
        >
          <span>Learn more</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   7. FAQ
   ------------------------------------------------------------- */
export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'What is Timely Compass?',
      answer: 'Timely Compass is an AI-powered conversational space designed to help students and curious thinkers explore interests, navigate choices, and discover meaningful directions without pressure.',
    },
    {
      id: 'faq-2',
      question: 'Is Timely Compass a career quiz?',
      answer: 'No. Career quizzes force you into predetermined categories through multiple-choice formulas. Timely Compass is an adaptable conversation that unpacks your personal reasoning, concerns, and curiosities.',
    },
    {
      id: 'faq-3',
      question: 'Who is Timely Compass for?',
      answer: 'Students of all ages, early-career explorers, and anyone experiencing uncertainty about what steps or areas to explore next.',
    },
    {
      id: 'faq-4',
      question: 'Does it tell me which career to choose?',
      answer: 'No. Timely Compass does not issue verdicts or prescribe careers. It helps you see possibilities clearly, understand trade-offs, and generate your own informed direction.',
    },
    {
      id: 'faq-5',
      question: 'Can AI career guidance be wrong?',
      answer: 'Yes. AI models can hallucinate details, misinterpret context, or overlook personal realities. Timely Compass is built for exploration, not definitive life advice.',
    },
    {
      id: 'faq-6',
      question: 'Does Timely Compass remember conversations?',
      answer: 'Your current session lives in your browser. You can save reflections or reset at any time with total privacy control.',
    },
    {
      id: 'faq-7',
      question: 'Should I make important decisions based only on AI?',
      answer: 'Never. Use Timely Compass to clarify questions and ideas, then discuss them with family, mentors, teachers, and trusted advisors.',
    },
  ];

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 border-t border-slate-200/70 dark:border-slate-800/70">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3478F6] dark:text-[#4C8DFF] mb-3 text-center">
          FAQ
        </p>

        <h2 className="text-2xl sm:text-3xl font-normal text-slate-900 dark:text-slate-100 font-display mb-10 text-center">
          Frequently asked questions.
        </h2>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={faq.id} className="py-4 sm:py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left gap-4 group"
                >
                  <span className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 group-hover:text-[#3478F6] dark:group-hover:text-[#4C8DFF] transition-colors">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-[#3478F6] dark:text-[#4C8DFF]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal pr-6">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   8. FINAL CTA
   ------------------------------------------------------------- */
export const FinalCtaSection: React.FC<{ onOpenExplorer: () => void }> = ({ onOpenExplorer }) => {
  return (
    <section id="final-cta" className="py-24 sm:py-32 bg-[#EDF2F9]/50 dark:bg-[#101827]/60 border-t border-slate-200/70 dark:border-slate-800/70 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
        
        {/* Subtle Compact Compass in Final CTA */}
        <div className="mb-8">
          <ModernCompass size="compact" showLabels={false} interactive={true} />
        </div>

        <h2 className="text-2xl sm:text-4xl font-normal text-slate-900 dark:text-slate-100 font-display mb-4 max-w-xl">
          Your direction starts with a conversation.
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mb-8 leading-relaxed font-normal">
          You don't have to know what you're looking for before you begin.
        </p>

        <button
          type="button"
          id="final-cta-start-exploring"
          onClick={onOpenExplorer}
          className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold bg-[#3478F6] dark:bg-[#4C8DFF] hover:bg-[#2563EB] dark:hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
        >
          <span>Start Exploring</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------
   9. QUIET FOOTER
   ------------------------------------------------------------- */
export const Footer: React.FC<{ onOpenExplorer: () => void }> = ({ onOpenExplorer }) => {
  return (
    <footer className="py-12 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 font-display">Timely Compass</span>
          <span>·</span>
          <span>Find your direction</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#what-is" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            What is it
          </a>
          <a href="#how-it-works" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            How it works
          </a>
          <a href="#responsible-ai" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Responsible AI
          </a>
          <a href="#faq" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            FAQ
          </a>
        </div>

        <div>
          © {new Date().getFullYear()} Timely Compass. Built with care.
        </div>
      </div>
    </footer>
  );
};
