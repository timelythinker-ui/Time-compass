import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ArrowRight, RotateCcw, Compass, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { ModernCompass } from './ModernCompass';
import { DirectionalConcept } from '../types';
import { SynthesisPayload, ConversationState } from '../engine/types';

interface ExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialSessionId?: string;
}

interface Message {
  id: string;
  sender: 'compass' | 'user';
  text: string;
  concept?: DirectionalConcept;
  suggestedPills?: string[];
  synthesis?: SynthesisPayload;
  action?: string;
}

export const ExplorationModal: React.FC<ExplorationModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  initialSessionId,
}) => {
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'compass',
      text: "Welcome to Timely Compass. Take a breath—there's no test score, no rush, and no wrong answers. What's one thing you're curious about or wondering about your future today?",
      suggestedPills: [
        "I'm feeling stuck between two paths",
        "I don't know what I'm naturally good at",
        "I want to explore careers with creative problem solving",
        "I'm worried about job security and stability",
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [activeConcept, setActiveConcept] = useState<DirectionalConcept>('Possibilities');
  const [isTyping, setIsTyping] = useState(false);
  const [convState, setConvState] = useState<ConversationState>('OPENING');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Initialize session on modal open
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      if (initialSessionId) {
        setSessionId(initialSessionId);
        if (initialPrompt) {
          handleUserSubmit(initialPrompt, initialSessionId);
        }
      } else {
        fetch('/api/explore/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.sessionId) {
              setSessionId(data.sessionId);
              if (data.state) setConvState(data.state);
            }
            if (initialPrompt) {
              handleUserSubmit(initialPrompt, data.sessionId);
            }
          })
          .catch((err) => {
            console.error('[UI] Failed to init session:', err);
            if (initialPrompt) {
              handleUserSubmit(initialPrompt);
            }
          });
      }
    }
  }, [isOpen, initialPrompt, initialSessionId]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleUserSubmit = async (userText: string, overrideSessionId?: string) => {
    if (!userText.trim()) return;

    const currentSessId = overrideSessionId || sessionId;
    console.log(`[UI] sending request: "${userText}" (sessionId: ${currentSessId || 'pending'})`);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/explore/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessId || undefined,
          message: userText,
        }),
      });

      let result: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error(`Engine returned non-JSON response: ${text.slice(0, 100)}`);
        }
      }

      console.log('[UI] received response:', result);
      setIsTyping(false);

      if (result.sessionId) setSessionId(result.sessionId);
      if (result.state) setConvState(result.state);
      if (result.conceptOrientation) {
        setActiveConcept(result.conceptOrientation as DirectionalConcept);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `compass-${Date.now()}`,
          sender: 'compass',
          text: result.replyText,
          concept: result.conceptOrientation as DirectionalConcept,
          suggestedPills: result.suggestedFollowUps,
          synthesis: result.synthesis,
          action: result.action,
        },
      ]);
    } catch (err) {
      console.error('[UI] Turn submission error:', err);
      setIsTyping(false);
      // Resilient fallback in case server is booting or offline
      setMessages((prev) => [
        ...prev,
        {
          id: `compass-err-${Date.now()}`,
          sender: 'compass',
          text: `I'm reflecting on "${userText}". Let's explore what specific aspect of this path feels most energizing to you versus what feels draining.`,
          concept: activeConcept,
          suggestedPills: [
            "Tell me about low-risk experiments",
            "Focus on my core values first",
            "How do I navigate uncertainty?",
          ],
        },
      ]);
    }
  };

  const handleReset = async () => {
    try {
      if (sessionId) {
        await fetch('/api/explore/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      }
    } catch (e) {
      console.error('Reset error:', e);
    }

    setActiveConcept('Possibilities');
    setConvState('OPENING');
    setMessages([
      {
        id: 'm-1',
        sender: 'compass',
        text: "Welcome to Timely Compass. Take a breath—there's no test score, no rush, and no wrong answers. What's one thing you're curious about or wondering about your future today?",
        suggestedPills: [
          "I'm feeling stuck between two paths",
          "I don't know what I'm naturally good at",
          "I want to explore careers with creative problem solving",
          "I'm worried about job security and stability",
        ],
      },
    ]);
  };

  const handleExportSummary = () => {
    const textContent = messages
      .map((m) => {
        let block = `${m.sender === 'user' ? 'You' : 'Timely Compass'}: ${m.text}`;
        if (m.synthesis) {
          block += `\n\n--- DIRECTION SYNTHESIS ---\nPattern: ${m.synthesis.pattern_reflection}\n\n`;
          m.synthesis.exploration_directions.forEach((d, i) => {
            block += `Direction ${i + 1}: ${d.title}\nWhy: ${d.why_it_fits}\nTension/Tradeoff: ${d.tensions_or_tradeoffs}\nNext Experiment: ${d.next_experiment}\n\n`;
          });
          block += `Explicit Unknowns:\n${m.synthesis.explicit_unknowns.map((u) => `• ${u}`).join('\n')}\n\n`;
          if (m.synthesis.questions_for_real_people && m.synthesis.questions_for_real_people.length > 0) {
            block += `Questions for Real People:\n${m.synthesis.questions_for_real_people.map((q) => `• ${q}`).join('\n')}\n\n`;
          }
          block += `Closing: ${m.synthesis.agency_preserving_close}\n`;
        }
        return block;
      })
      .join('\n\n');

    const blob = new Blob([`TIMELY COMPASS — EXPLORATION REFLECTIONS\n\n${textContent}`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timely-compass-reflection-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="exploration-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[780px] bg-white dark:bg-[#0E1624] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Interactive Visual Compass Anchor */}
        <div className="w-full md:w-80 bg-slate-50 dark:bg-[#0B101A] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800/80 p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 font-display">
              <Compass className="w-4 h-4 text-[#3478F6] dark:text-[#4C8DFF]" />
              <span>Timely Compass</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
              title="Reset exploration"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="my-auto py-3 flex flex-col items-center">
            <ModernCompass
              size="compact"
              activeConcept={activeConcept}
              onSelectConcept={(c) => setActiveConcept(c)}
              interactive={true}
            />
            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Orientation: <span className="text-[#3478F6] dark:text-[#4C8DFF] font-semibold">{activeConcept || 'Exploring'}</span>
              </p>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                State: {convState.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="w-full pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={handleExportSummary}
              className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Reflection</span>
            </button>
            <span className="text-[11px] opacity-70">No test scores</span>
          </div>
        </div>

        {/* Right: The Conversational Space */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#162235] h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-display">
                Direction Exploration Session
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore without fixed categories or final verdicts
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages stream */}
          <div
            ref={messagesContainerRef}
            className="flex-1 p-6 overflow-y-auto space-y-4 text-sm"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {m.sender === 'compass' ? (
                  <div className="space-y-3 max-w-[92%]">
                    <div className="bg-slate-100 dark:bg-[#1C2B42] text-slate-800 dark:text-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-200/60 dark:border-slate-700/60 leading-relaxed whitespace-pre-line">
                      {m.text}
                    </div>

                    {/* Rich Direction Synthesis Card (When Action is SYNTHESIZE) */}
                    {m.synthesis && (
                      <div className="p-4 sm:p-5 rounded-xl bg-blue-50/70 dark:bg-[#111C2E] border border-blue-200/80 dark:border-blue-800/80 space-y-4 my-2 text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-900/60">
                          <CheckCircle2 className="w-4 h-4 text-[#3478F6] dark:text-[#4C8DFF]" />
                          <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#3478F6] dark:text-[#4C8DFF]">
                            Emerging Exploration Directions
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {m.synthesis.exploration_directions.map((dir, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-lg bg-white/90 dark:bg-[#16243A] border border-blue-100 dark:border-blue-900/50 space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#3478F6] dark:text-[#4C8DFF]">
                                  Direction {idx + 1}:
                                </span>
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {dir.title}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                <strong className="text-slate-700 dark:text-slate-200">Why it fits:</strong> {dir.why_it_fits}
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300/90">
                                <strong>Honest Tradeoff:</strong> {dir.tensions_or_tradeoffs}
                              </p>
                              <div className="pt-1 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-1">
                                <span className="shrink-0 font-semibold">Next experiment:</span>
                                <span>{dir.next_experiment}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {m.synthesis.explicit_unknowns && m.synthesis.explicit_unknowns.length > 0 && (
                          <div className="pt-2 border-t border-blue-200/50 dark:border-blue-900/50">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Explicit Unknowns & Questions to Keep Exploring:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                              {m.synthesis.explicit_unknowns.map((u, i) => (
                                <li key={i}>{u}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {m.synthesis.questions_for_real_people && m.synthesis.questions_for_real_people.length > 0 && (
                          <div className="pt-2 border-t border-blue-200/50 dark:border-blue-900/50">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Questions for Real People (Mentors / Practitioners):
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                              {m.synthesis.questions_for_real_people.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-1">
                          “{m.synthesis.agency_preserving_close}”
                        </p>
                      </div>
                    )}

                    {m.suggestedPills && m.suggestedPills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.suggestedPills.map((pill) => (
                          <button
                            key={pill}
                            type="button"
                            onClick={() => handleUserSubmit(pill)}
                            className="text-xs bg-slate-50 dark:bg-[#121C2C] hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-[#3478F6] dark:hover:text-[#4C8DFF] border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-lg transition-all text-left flex items-center gap-1.5"
                          >
                            <span>{pill}</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#3478F6] dark:bg-[#4C8DFF] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed font-medium">
                    {m.text}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#111A29] rounded-xl w-fit">
                <Sparkles className="w-3.5 h-3.5 text-[#20B8A6] animate-pulse" />
                <span>Reflecting and orienting compass...</span>
              </div>
            )}
          </div>

          {/* Bottom input area */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111928]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserSubmit(inputVal);
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Share whatever comes to mind..."
                className="w-full bg-white dark:bg-[#162235] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#3478F6] dark:focus:border-[#4C8DFF] transition-all"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                className="absolute right-2 p-2 rounded-lg bg-[#3478F6] dark:bg-[#4C8DFF] text-white disabled:opacity-30 hover:bg-blue-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2">
              Explore freely · Discuss important directions with family and trusted mentors
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
