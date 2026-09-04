import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ModernCompass } from './components/ModernCompass';
import { HeroChatbot } from './components/HeroChatbot';
import {
  WhatIsSection,
  WhyDifferentSection,
  HowItWorksSection,
  WhatYouGetSection,
  ResponsibleAiSection,
  AboutSection,
  FaqSection,
  FinalCtaSection,
  Footer,
} from './components/Sections';
import { ExplorationModal } from './components/ExplorationModal';
import { SignInModal } from './components/SignInModal';
import { SpatialBackground } from './components/SpatialBackground';
import { DirectionalConcept } from './types';

export default function App() {
  // Theme state: default to Light Mode (Primary Experience) or user's saved preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tc_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    }
    return false; // Primary experience defaults to clean Light Mode
  });

  const [activeConcept, setActiveConcept] = useState<DirectionalConcept>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [initialExplorerPrompt, setInitialExplorerPrompt] = useState<string | undefined>(undefined);
  const [initialExplorerSessionId, setInitialExplorerSessionId] = useState<string | undefined>(undefined);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('tc_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('tc_theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const handleOpenExplorerWithPrompt = (prompt?: string, sessionId?: string) => {
    setInitialExplorerPrompt(prompt);
    setInitialExplorerSessionId(sessionId);
    setExplorerOpen(true);
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FC] dark:bg-[#080D18] text-[#101828] dark:text-[#F4F7FB] transition-colors duration-300 font-sans relative">
      {/* Subtle 3D Spatial Background Environment (Navigation Curves, Far Orbital Rings & Waypoints) */}
      <SpatialBackground darkMode={darkMode} />
      
      {/* 10. NAVIGATION */}
      <Navbar
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onOpenExplorer={() => handleOpenExplorerWithPrompt()}
        onOpenSignIn={() => setSignInOpen(true)}
      />

      {/* 5, 6, 7, 8. HERO SECTION */}
      <main className="flex-grow">
        <section id="hero" className="pt-12 sm:pt-20 pb-20 sm:pb-28 overflow-hidden relative">
          
          {/* Subtle Ambient Radial Lighting in the background (No generic purple gradient, strictly blue/teal subtle tints) */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[500px] bg-gradient-to-b from-blue-500/[0.04] dark:from-blue-500/[0.07] via-teal-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            
            {/* Desktop 2-Column Composition / Intentional Mobile Hierarchy */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
              
              {/* Left Column: Headline, Explanation, CTAs & Transparency Note */}
              <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6">
                
                {/* Small Eyebrow */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-[#162235] border border-blue-200/60 dark:border-blue-900/60 text-[#3478F6] dark:text-[#4C8DFF] text-xs font-semibold tracking-wide">
                  <Sparkles className="w-3 h-3 text-[#20B8A6] dark:text-[#25C7B3]" />
                  <span>AI-POWERED CAREER EXPLORATION</span>
                </div>

                {/* Main Headline */}
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-5xl font-normal text-slate-900 dark:text-slate-100 font-display leading-[1.15] tracking-tight">
                    You don't need to know your destination.
                  </h1>
                  <h1 className="text-3xl sm:text-5xl font-medium text-[#3478F6] dark:text-[#4C8DFF] font-display leading-[1.15] tracking-tight">
                    You just need a direction.
                  </h1>
                </div>

                {/* Supporting Text */}
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
                  Explore your interests, goals and possibilities through a conversation that adapts as you think.
                </p>

                {/* CTAs */}
                <div className="pt-2 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                  <button
                    type="button"
                    id="hero-primary-cta"
                    onClick={() => handleOpenExplorerWithPrompt()}
                    className="inline-flex items-center justify-center gap-2 bg-[#3478F6] dark:bg-[#4C8DFF] hover:bg-[#2563EB] dark:hover:bg-blue-500 text-white font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                  >
                    <span>Start Exploring</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    id="hero-secondary-cta"
                    onClick={scrollToHowItWorks}
                    className="inline-flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-[#162235] hover:bg-slate-50 dark:hover:bg-[#1C2B42] border border-slate-200 dark:border-slate-700/80 font-medium text-sm sm:text-base px-5 py-3.5 rounded-xl transition-all"
                  >
                    See How It Works
                  </button>
                </div>

                {/* Small Transparency Statement */}
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md pt-3 font-normal leading-relaxed">
                  AI can make mistakes. Timely Compass helps you explore—it doesn't decide your future for you.
                </p>
              </div>

              {/* Right Column: Chatbot + Integrated 3D Modern Navigation Compass */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[440px] lg:min-h-[480px]">
                
                {/* Integrated 3D Compass Ambient Spatial Layer (Layered behind/beside the Chatbot on desktop) */}
                <div className="absolute -top-6 -right-6 lg:-right-8 w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 pointer-events-auto z-10 opacity-75 dark:opacity-85 hidden sm:flex items-center justify-center transition-all">
                  <ModernCompass
                    size="normal"
                    activeConcept={activeConcept}
                    onSelectConcept={(concept) => setActiveConcept(concept)}
                    showLabels={true}
                    interactive={true}
                  />
                </div>

                {/* Foreground Chatbot Interface with Directional Navigation bar */}
                <div className="w-full max-w-lg z-20 relative">
                  {/* Subtle Directional Concept Quick Selector above Chatbot */}
                  <div className="flex items-center justify-between gap-1.5 mb-2.5 px-1 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase shrink-0">
                      Directions:
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(['Goals', 'Interests', 'Possibilities', 'Constraints', 'Motivation'] as DirectionalConcept[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setActiveConcept(activeConcept === c ? null : c)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                            activeConcept === c
                              ? 'bg-[#3478F6] dark:bg-[#4C8DFF] text-white shadow-xs'
                              : 'bg-white/90 dark:bg-[#162235]/90 hover:bg-slate-100 dark:hover:bg-[#1E2E47] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <HeroChatbot
                    activeConcept={activeConcept}
                    onConceptSelect={(concept) => setActiveConcept(concept)}
                    onOpenFullExplorer={(prompt, sessionId) => handleOpenExplorerWithPrompt(prompt, sessionId)}
                  />
                </div>

                {/* Mobile-only clean compass representation */}
                <div className="sm:hidden mt-6 w-full flex flex-col items-center justify-center z-10 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                    DIGITAL NAVIGATION COMPASS
                  </p>
                  <ModernCompass
                    size="compact"
                    activeConcept={activeConcept}
                    onSelectConcept={(concept) => setActiveConcept(concept)}
                    interactive={true}
                  />
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* 9. HOMEPAGE SECTIONS AFTER HERO */}
        
        {/* WHAT IS TIMELY COMPASS? */}
        <WhatIsSection />

        {/* WHY IT IS DIFFERENT */}
        <WhyDifferentSection />

        {/* HOW IT WORKS */}
        <HowItWorksSection />

        {/* WHAT YOU GET */}
        <WhatYouGetSection />

        {/* RESPONSIBLE AI */}
        <ResponsibleAiSection />

        {/* ABOUT TIMELY THINKER */}
        <AboutSection />

        {/* FAQ */}
        <FaqSection />

        {/* FINAL CTA */}
        <FinalCtaSection onOpenExplorer={() => handleOpenExplorerWithPrompt()} />

      </main>

      {/* QUIET FOOTER */}
      <Footer onOpenExplorer={() => handleOpenExplorerWithPrompt()} />

      {/* MODALS */}
      <ExplorationModal
        isOpen={explorerOpen}
        onClose={() => setExplorerOpen(false)}
        initialPrompt={initialExplorerPrompt}
        initialSessionId={initialExplorerSessionId}
      />

      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
      />

    </div>
  );
}
