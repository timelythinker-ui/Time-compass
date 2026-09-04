import React, { useState } from 'react';
import { Sun, Moon, ArrowRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenExplorer: () => void;
  onOpenSignIn: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleTheme,
  onOpenExplorer,
  onOpenSignIn,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F6F8FC]/90 dark:bg-[#080D18]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 group"
        >
          {/* Modern Compass Glyph Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border border-slate-700/60 dark:border-slate-600/60 flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
              <polygon points="12,5 14,12 12,11 10,12" fill="#3478F6" className="dark:fill-[#4C8DFF]" />
              <polygon points="12,19 14,12 12,13 10,12" fill="#94A3B8" />
              <circle cx="12" cy="12" r="1.5" fill="#20B8A6" />
            </svg>
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-display">
            Timely Compass
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-[#3478F6] dark:hover:text-[#4C8DFF] transition-colors"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-[#3478F6] dark:hover:text-[#4C8DFF] transition-colors"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('about')}
            className="hover:text-[#3478F6] dark:hover:text-[#4C8DFF] transition-colors"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('faq')}
            className="hover:text-[#3478F6] dark:hover:text-[#4C8DFF] transition-colors"
          >
            FAQ
          </button>
        </nav>

        {/* Right Actions: Theme Toggle, Sign In, Primary CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Light/Dark Toggle */}
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sign In */}
          <button
            type="button"
            id="nav-signin-btn"
            onClick={onOpenSignIn}
            className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </button>

          {/* Start Exploring CTA */}
          <button
            type="button"
            id="nav-start-exploring-btn"
            onClick={onOpenExplorer}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-[#3478F6] dark:bg-[#4C8DFF] hover:bg-[#2563EB] dark:hover:bg-blue-500 text-white px-3.5 sm:px-4 py-2 rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            <span>Start Exploring</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 bg-[#F6F8FC] dark:bg-[#080D18] border-b border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('about')}
            className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('faq')}
            className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            FAQ
          </button>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSignIn();
              }}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Sign In
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
