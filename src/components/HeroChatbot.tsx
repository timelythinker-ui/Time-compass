import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { DirectionalConcept } from '../types';
import { SynthesisPayload, ConversationState } from '../engine/types';

interface HeroChatbotProps {
  activeConcept?: DirectionalConcept;
  onConceptSelect?: (concept: DirectionalConcept) => void;
  onOpenFullExplorer?: (initialContext?: string, sessionId?: string) => void;
}

interface DialogueTurn {
  id: string;
  sender: 'compass' | 'user';
  text: string;
  concept?: DirectionalConcept;
  followUpOptions?: string[];
  synthesis?: SynthesisPayload;
  action?: string;
}

export const HeroChatbot: React.FC<HeroChatbotProps> = ({
  activeConcept,
  onConceptSelect,
  onOpenFullExplorer,
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [history, setHistory] = useState<DialogueTurn[]>([
    {
      id: 'init-1',
      sender: 'compass',
      text: 'What are you trying to figure out?',
      followUpOptions: [
        "I don't know what career I want",
        "I like both biology and technology",
        "I'm worried about choosing the wrong path",
        "I have too many different interests",
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dismissedConcept, setDismissedConcept] = useState<string | null>(null);
  const [convState, setConvState] = useState<ConversationState>('OPENING');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sessionInitializedRef = useRef(false);

  // Initialize session on mount
  useEffect(() => {
    if (!sessionInitializedRef.current) {
      sessionInitializedRef.current = true;
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
        })
        .catch((err) => {
          console.error('[UI] Failed to init hero session:', err);
        });
    }
  }, []);

  // Directional concept starter prompts mapping
  const conceptPromptMap: Record<string, { prompt: string }> = {
    Goals: {
      prompt: "I want to explore what I'm hoping to achieve in my future path.",
    },
    Interests: {
      prompt: "I want to explore what subjects and problems keep catching my attention.",
    },
    Possibilities: {
      prompt: "I want to explore open possibilities without feeling locked into standard career titles.",
    },
    Constraints: {
      prompt: "I want to look at what's making this decision feel heavy or uncertain.",
    },
    Motivation: {
      prompt: "I want to explore what drives my energy and what kind of impact matters to me.",
    },
  };

  const starterChoices = [
    {
      label: "I don't know what career I want.",
      concept: 'Possibilities' as DirectionalConcept,
    },
    {
      label: "I like both biology and technology.",
      concept: 'Interests' as DirectionalConcept,
    },
    {
      label: "I have too many different interests.",
      concept: 'Interests' as DirectionalConcept,
    },
    {
      label: "I'm worried about choosing the wrong path.",
      concept: 'Constraints' as DirectionalConcept,
    },
  ];

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isTyping]);

  const handleSendTurn = async (userMessage: string) => {
    const clean = userMessage.trim();
    if (!clean) return;

    console.log(`[UI] sending request: "${clean}" (sessionId: ${sessionId || 'pending'})`);

    const userTurn: DialogueTurn = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: clean,
    };

    setHistory((prev) => [...prev, userTurn]);
    setInputVal('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/explore/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: clean,
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
        if (onConceptSelect) {
          onConceptSelect(result.conceptOrientation as DirectionalConcept);
        }
      }

      setHistory((prev) => [
        ...prev,
        {
          id: `compass-${Date.now()}`,
          sender: 'compass',
          text: result.replyText,
          concept: result.conceptOrientation as DirectionalConcept,
          followUpOptions: result.suggestedFollowUps,
          synthesis: result.synthesis,
          action: result.action,
        },
      ]);
    } catch (error) {
      console.error('[UI] Engine turn error:', error);
      setIsTyping(false);

      // Safe fallback reflection if offline
      setHistory((prev) => [
        ...prev,
        {
          id: `compass-fb-${Date.now()}`,
          sender: 'compass',
          text: `It makes sense to explore "${clean}". What feels like the most energizing part of this for you, and what part feels uncertain?`,
          followUpOptions: [
            "Tell me more about exploring this path",
            "Focus on core values first",
            "Take into full explorer",
          ],
        },
      ]);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    handleSendTurn(inputVal);
  };

  const handleReset = async () => {
    if (sessionId) {
      try {
        await fetch('/api/explore/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch (e) {
        console.error('[UI] Reset error:', e);
      }
    }

    setConvState('OPENING');
    setHistory([
      {
        id: 'init-1',
        sender: 'compass',
        text: 'What are you trying to figure out?',
        followUpOptions: [
          "I don't know what career I want",
          "I like both biology and technology",
          "I'm worried about choosing the wrong path",
          "I have too many different interests",
        ],
      },
    ]);
    if (onConceptSelect) onConceptSelect(null);
  };

  return (
    <div
      id="hero-chatbot-card"
      className="w-full max-w-lg mx-auto lg:mx-0 bg-white dark:bg-[#162235] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-[0_4px_24px_rgba(16,24,40,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden transition-all duration-300"
    >
      {/* Header with Compass identity indicator */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#121C2C]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3478F6] dark:bg-[#4C8DFF] ring-4 ring-blue-500/10 dark:ring-blue-400/20" />
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-display">
            Timely Compass
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">
            · Live Behavioral Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center gap-1 transition-colors px-2 py-1 rounded"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {onOpenFullExplorer && history.length > 1 && (
            <button
              type="button"
              onClick={() => onOpenFullExplorer(undefined, sessionId)}
              className="text-xs text-[#3478F6] dark:text-[#4C8DFF] font-medium hover:underline flex items-center gap-1"
            >
              <span>Expand</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation Thread */}
      <div
        ref={messagesContainerRef}
        className="p-5 overflow-y-auto max-h-[340px] space-y-3.5 text-sm"
      >
        {/* Contextual Directional Concept Prompt connected from the compass */}
        {activeConcept && conceptPromptMap[activeConcept] && dismissedConcept !== activeConcept && (
          <div className="p-3.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 mb-2 flex flex-col gap-2 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3478F6] dark:text-[#4C8DFF] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#20B8A6] dark:text-[#25C7B3]" />
                Direction: {activeConcept}
              </span>
              <button
                type="button"
                onClick={() => setDismissedConcept(activeConcept)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                title="Dismiss starter"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
              “{conceptPromptMap[activeConcept].prompt}”
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleSendTurn(conceptPromptMap[activeConcept].prompt)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#3478F6] dark:bg-[#4C8DFF] text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Explore this thought</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {history.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'compass' ? (
              <div className="space-y-3 max-w-[92%]">
                <div className="bg-slate-100/90 dark:bg-[#1C2B42] text-slate-800 dark:text-[#F4F7FB] px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-200/50 dark:border-slate-700/50 leading-relaxed font-normal">
                  {msg.text}
                </div>

                {/* Synthesis Card in Hero if generated */}
                {msg.synthesis && (
                  <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-[#111C2E] border border-blue-200/80 dark:border-blue-800/80 space-y-2.5 my-1 text-slate-800 dark:text-slate-100 text-xs">
                    <div className="flex items-center justify-between pb-1 border-b border-blue-200/60 dark:border-blue-900/60">
                      <span className="font-semibold uppercase tracking-wider text-[#3478F6] dark:text-[#4C8DFF]">
                        Direction Synthesis
                      </span>
                      {onOpenFullExplorer && (
                        <button
                          type="button"
                          onClick={() => onOpenFullExplorer('View Full Synthesis', sessionId)}
                          className="text-[11px] font-semibold text-[#3478F6] dark:text-[#4C8DFF] hover:underline"
                        >
                          Expand in Modal →
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {msg.synthesis.exploration_directions.map((d, i) => (
                        <div key={i} className="p-2 rounded bg-white/80 dark:bg-[#16243A] border border-blue-100/60 dark:border-blue-900/40">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">Direction {i + 1}: {d.title}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300"><strong>Next experiment:</strong> {d.next_experiment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up suggestion pills from the real engine */}
                {msg.followUpOptions && msg.followUpOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.followUpOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (opt.includes('full explorer') && onOpenFullExplorer) {
                            onOpenFullExplorer(opt, sessionId);
                          } else {
                            handleSendTurn(opt);
                          }
                        }}
                        className="text-xs bg-white dark:bg-[#121C2C] hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-[#3478F6] dark:hover:text-[#4C8DFF] border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-lg transition-all text-left flex items-center gap-1.5"
                      >
                        <span>{opt}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#3478F6] dark:bg-[#4C8DFF] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed font-medium shadow-sm">
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {/* Initial Starter Choices if only initial question is active */}
        {history.length === 1 && (
          <div className="pt-2 space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {starterChoices.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => handleSendTurn(choice.label)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111A29] hover:bg-blue-50/80 dark:hover:bg-[#1E2E47] border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-all flex items-center justify-between group"
                >
                  <span>{choice.label}</span>
                  <span className="text-slate-400 group-hover:text-[#3478F6] dark:group-hover:text-[#4C8DFF] transition-colors">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#111A29] rounded-xl w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#20B8A6] animate-pulse" />
            <span>Thinking with you...</span>
          </div>
        )}
      </div>

      {/* Input area & supportive microcopy */}
      <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-[#111928] border-t border-slate-100 dark:border-slate-800/80">
        <form onSubmit={handleCustomSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type anything on your mind..."
            className="w-full bg-white dark:bg-[#162235] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#3478F6] dark:focus:border-[#4C8DFF] transition-all"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isTyping}
            className="absolute right-1.5 p-1.5 rounded-lg bg-[#3478F6] dark:bg-[#4C8DFF] text-white disabled:opacity-30 disabled:bg-slate-300 dark:disabled:bg-slate-700 hover:bg-blue-600 transition-colors"
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Reassuring Microcopy */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2.5 font-normal">
          There are no right answers here. Start wherever you are.
        </p>
      </div>
    </div>
  );
};

