import React, { useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <div
      id="signin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-sm bg-white dark:bg-[#162235] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-[#3478F6] dark:text-[#4C8DFF] flex items-center justify-center font-display font-bold text-base">
            TC
          </div>
          <h3 className="text-lg font-normal text-slate-900 dark:text-slate-100 font-display">
            Welcome to Timely Compass
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Save your explorations and revisit your thoughts anytime
          </p>
        </div>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-500/10 text-[#20B8A6] flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Magic link sent to {email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check your inbox to resume your journey.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#121C2C] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.edu or personal email"
                className="w-full bg-slate-50 dark:bg-[#111928] text-slate-900 dark:text-slate-100 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#3478F6] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#3478F6] dark:bg-[#4C8DFF] hover:bg-[#2563EB] text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Continue with Email</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              Passwordless & private · We never sell your data
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
