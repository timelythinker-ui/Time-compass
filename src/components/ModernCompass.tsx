import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { DirectionalConcept } from '../types';

interface ModernCompassProps {
  activeConcept?: DirectionalConcept;
  onSelectConcept?: (concept: DirectionalConcept) => void;
  size?: 'normal' | 'large' | 'compact';
  showLabels?: boolean;
  interactive?: boolean;
  className?: string;
}

export const ModernCompass: React.FC<ModernCompassProps> = ({
  activeConcept,
  onSelectConcept,
  size = 'normal',
  showLabels = true,
  interactive = true,
  className = '',
}) => {
  const [internalConcept, setInternalConcept] = useState<DirectionalConcept>(null);
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [needleAngle, setNeedleAngle] = useState<number>(24);
  const targetAngleRef = useRef<number>(24);
  const currentAngleRef = useRef<number>(24);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveConcept = activeConcept !== undefined ? activeConcept : internalConcept;

  // Angles for each concept
  const conceptAngles: Record<string, number> = {
    Goals: 0,
    Interests: 55,
    Possibilities: 125,
    Constraints: 215,
    Motivation: 305,
  };

  useEffect(() => {
    if (effectiveConcept && conceptAngles[effectiveConcept] !== undefined) {
      targetAngleRef.current = conceptAngles[effectiveConcept];
    } else {
      targetAngleRef.current = 28; // default subtle organic angle
    }
  }, [effectiveConcept]);

  // Smooth animation loop for needle with magnetic spring damping
  useEffect(() => {
    let animFrame: number;
    const updateNeedle = () => {
      const diff = targetAngleRef.current - currentAngleRef.current;
      // Handle 360 wraparound smoothly
      let normalizedDiff = ((diff + 180) % 360) - 180;
      currentAngleRef.current += normalizedDiff * 0.12;
      setNeedleAngle(currentAngleRef.current);
      animFrame = requestAnimationFrame(updateNeedle);
    };

    animFrame = requestAnimationFrame(updateNeedle);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const relX = (e.clientX - centerX) / (rect.width / 2);
    const relY = (e.clientY - centerY) / (rect.height / 2);

    // subtle 3D tilt
    setMouseTilt({
      x: Math.max(-1, Math.min(1, relX)) * 7,
      y: Math.max(-1, Math.min(1, relY)) * -7,
    });

    // If no concept hovered, needle responds gently to mouse proximity
    if (!effectiveConcept) {
      const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let deg = (rad * 180) / Math.PI + 90;
      targetAngleRef.current = deg;
    }
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
    if (!effectiveConcept) {
      targetAngleRef.current = 28;
    }
  };

  const handleConceptHover = (concept: DirectionalConcept) => {
    if (!interactive) return;
    setInternalConcept(concept);
    if (onSelectConcept) {
      onSelectConcept(concept);
    }
  };

  // Dimensions based on size
  const dimensionClass = {
    compact: 'w-48 h-48 sm:w-56 sm:h-56',
    normal: 'w-64 h-64 sm:w-80 sm:h-80',
    large: 'w-72 h-72 sm:w-96 sm:h-96',
  }[size];

  return (
    <div
      id="modern-compass-wrapper"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ perspective: '1000px' }}
    >
      {/* Surrounding Directional Nodes (Small, Elegant Points/Labels) */}
      {showLabels && (
        <>
          {/* Goals (Top - 0°) */}
          <button
            type="button"
            id="concept-node-goals"
            onMouseEnter={() => handleConceptHover('Goals')}
            onMouseLeave={() => handleConceptHover(null)}
            onClick={() => handleConceptHover('Goals')}
            className={`absolute -top-3 sm:-top-5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 z-20 flex items-center gap-1.5 ${
              effectiveConcept === 'Goals'
                ? 'bg-blue-500/10 dark:bg-blue-500/20 text-[#3478F6] dark:text-[#4C8DFF] border border-blue-500/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${effectiveConcept === 'Goals' ? 'bg-[#3478F6] dark:bg-[#4C8DFF] scale-125' : 'bg-slate-400/60'}`} />
            <span>Goals</span>
          </button>

          {/* Interests (Top Right - 55°) */}
          <button
            type="button"
            id="concept-node-interests"
            onMouseEnter={() => handleConceptHover('Interests')}
            onMouseLeave={() => handleConceptHover(null)}
            onClick={() => handleConceptHover('Interests')}
            className={`absolute top-6 -right-2 sm:top-8 sm:-right-4 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 z-20 flex items-center gap-1.5 ${
              effectiveConcept === 'Interests'
                ? 'bg-teal-500/10 dark:bg-teal-500/20 text-[#20B8A6] dark:text-[#25C7B3] border border-teal-500/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${effectiveConcept === 'Interests' ? 'bg-[#20B8A6] dark:bg-[#25C7B3] scale-125' : 'bg-slate-400/60'}`} />
            <span>Interests</span>
          </button>

          {/* Possibilities (Right/Bottom-Right - 125°) */}
          <button
            type="button"
            id="concept-node-possibilities"
            onMouseEnter={() => handleConceptHover('Possibilities')}
            onMouseLeave={() => handleConceptHover(null)}
            onClick={() => handleConceptHover('Possibilities')}
            className={`absolute bottom-8 -right-3 sm:bottom-12 sm:-right-6 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 z-20 flex items-center gap-1.5 ${
              effectiveConcept === 'Possibilities'
                ? 'bg-blue-500/10 dark:bg-blue-500/20 text-[#3478F6] dark:text-[#4C8DFF] border border-blue-500/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${effectiveConcept === 'Possibilities' ? 'bg-[#3478F6] dark:bg-[#4C8DFF] scale-125' : 'bg-slate-400/60'}`} />
            <span>Possibilities</span>
          </button>

          {/* Constraints (Bottom-Left - 215°) */}
          <button
            type="button"
            id="concept-node-constraints"
            onMouseEnter={() => handleConceptHover('Constraints')}
            onMouseLeave={() => handleConceptHover(null)}
            onClick={() => handleConceptHover('Constraints')}
            className={`absolute bottom-8 -left-3 sm:bottom-12 sm:-left-6 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 z-20 flex items-center gap-1.5 ${
              effectiveConcept === 'Constraints'
                ? 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-400/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${effectiveConcept === 'Constraints' ? 'bg-slate-500 scale-125' : 'bg-slate-400/60'}`} />
            <span>Constraints</span>
          </button>

          {/* Motivation (Top Left - 305°) */}
          <button
            type="button"
            id="concept-node-motivation"
            onMouseEnter={() => handleConceptHover('Motivation')}
            onMouseLeave={() => handleConceptHover(null)}
            onClick={() => handleConceptHover('Motivation')}
            className={`absolute top-6 -left-2 sm:top-8 sm:-left-4 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 z-20 flex items-center gap-1.5 ${
              effectiveConcept === 'Motivation'
                ? 'bg-teal-500/10 dark:bg-teal-500/20 text-[#20B8A6] dark:text-[#25C7B3] border border-teal-500/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${effectiveConcept === 'Motivation' ? 'bg-[#20B8A6] dark:bg-[#25C7B3] scale-125' : 'bg-slate-400/60'}`} />
            <span>Motivation</span>
          </button>
        </>
      )}

      {/* Main 3D Digital Compass Bezel */}
      <motion.div
        id="compass-chassis"
        className={`relative ${dimensionClass} rounded-full transition-transform duration-200 ease-out`}
        style={{
          transform: `rotateY(${mouseTilt.x}deg) rotateX(${mouseTilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Soft realistic drop shadow under chassis */}
        <div className="absolute inset-0 rounded-full shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)]" />

        {/* Outer Bezel - Dark Graphite & Titanium Edge */}
        <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 shadow-inner">
          <div className="w-full h-full rounded-full p-[8px] sm:p-[10px] bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#131B29] dark:to-[#0B101A] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] flex items-center justify-center">
            
            {/* Inner Dial Face - Cool Slate / Graphite with subtle circular brushed texture */}
            <div className="relative w-full h-full rounded-full bg-[#FFFFFF] dark:bg-[#0E1624] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex items-center justify-center">
              
              {/* Subtle glass reflection gradient across the dial */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 dark:via-white/[0.03] to-blue-500/[0.04] pointer-events-none rounded-full" />
              
              {/* Compass Dial Vector Graphics */}
              <svg
                viewBox="0 0 300 300"
                className="w-full h-full absolute inset-0 text-slate-400 dark:text-slate-600"
              >
                {/* Concentric subtle guide rings */}
                <circle cx="150" cy="150" r="132" fill="none" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.35" />
                <circle cx="150" cy="150" r="118" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />
                <circle cx="150" cy="150" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
                <circle cx="150" cy="150" r="42" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />

                {/* Degree tick marks: 72 ticks (every 5 degrees) */}
                {Array.from({ length: 72 }).map((_, i) => {
                  const angle = i * 5;
                  const isMajor = angle % 30 === 0;
                  const isCardinal = angle % 90 === 0;
                  const length = isCardinal ? 9 : isMajor ? 6 : 3;
                  const strokeWidth = isCardinal ? 1.5 : isMajor ? 1 : 0.6;
                  const opacity = isCardinal ? 0.9 : isMajor ? 0.6 : 0.3;

                  return (
                    <line
                      key={i}
                      x1="150"
                      y1={150 - 130}
                      x2="150"
                      y2={150 - 130 + length}
                      stroke="currentColor"
                      strokeWidth={strokeWidth}
                      strokeOpacity={opacity}
                      transform={`rotate(${angle} 150 150)`}
                    />
                  );
                })}

                {/* Subtle Directional Marks: N, E, S, W */}
                <text
                  x="150"
                  y="40"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[11px] font-semibold tracking-wider fill-[#3478F6] dark:fill-[#4C8DFF]"
                >
                  N
                </text>
                <text
                  x="262"
                  y="150"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                >
                  E
                </text>
                <text
                  x="150"
                  y="262"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                >
                  S
                </text>
                <text
                  x="38"
                  y="150"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                >
                  W
                </text>

                {/* Delicate micro coordinates/degrees for modern digital navigational look */}
                <text x="150" y="80" textAnchor="middle" className="text-[7px] font-mono fill-slate-400/50 dark:fill-slate-500/50">000°</text>
                <text x="220" y="150" textAnchor="middle" className="text-[7px] font-mono fill-slate-400/50 dark:fill-slate-500/50">090°</text>
                <text x="150" y="222" textAnchor="middle" className="text-[7px] font-mono fill-slate-400/50 dark:fill-slate-500/50">180°</text>
                <text x="80" y="150" textAnchor="middle" className="text-[7px] font-mono fill-slate-400/50 dark:fill-slate-500/50">270°</text>
              </svg>

              {/* Dynamic Modern Magnetic Needle */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transition: 'transform 0.05s linear',
                }}
              >
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  <defs>
                    {/* Blue north gradient */}
                    <linearGradient id="northNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3478F6" />
                      <stop offset="50%" stopColor="#4C8DFF" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>

                    {/* Teal accent tip */}
                    <linearGradient id="tealTipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#20B8A6" />
                      <stop offset="100%" stopColor="#25C7B3" />
                    </linearGradient>

                    {/* Slate south needle gradient */}
                    <linearGradient id="southNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#94A3B8" />
                      <stop offset="50%" stopColor="#CBD5E1" />
                      <stop offset="100%" stopColor="#64748B" />
                    </linearGradient>

                    {/* Pivot glow */}
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#3478F6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3478F6" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Gentle shadow of needle */}
                  <polygon
                    points="150,56 156,150 150,154 144,150"
                    fill="rgba(0,0,0,0.15)"
                    transform="translate(2, 3)"
                  />
                  <polygon
                    points="150,244 155,150 150,146 145,150"
                    fill="rgba(0,0,0,0.12)"
                    transform="translate(2, 3)"
                  />

                  {/* North Pointer (Blue / Teal High Precision Blade) */}
                  {/* Left Facet */}
                  <polygon
                    points="150,52 144,150 150,147"
                    fill="url(#northNeedleGrad)"
                  />
                  {/* Right Facet (Lighter for 3D metallic feel) */}
                  <polygon
                    points="150,52 156,150 150,147"
                    fill="#60A5FA"
                  />
                  {/* Glowing Teal Arrow Tip */}
                  <polygon
                    points="150,50 146,72 150,68 154,72"
                    fill="url(#tealTipGrad)"
                  />

                  {/* South Pointer (Cool Slate / Titanium) */}
                  {/* Left Facet */}
                  <polygon
                    points="150,248 145,150 150,153"
                    fill="url(#southNeedleGrad)"
                  />
                  {/* Right Facet */}
                  <polygon
                    points="150,248 155,150 150,153"
                    fill="#E2E8F0"
                    className="dark:fill-[#475569]"
                  />

                  {/* Center Pivot Bezel & Core */}
                  <circle cx="150" cy="150" r="18" fill="url(#centerGlow)" />
                  <circle cx="150" cy="150" r="10" fill="#1E293B" className="dark:fill-[#0F172A]" stroke="#64748B" strokeWidth="1.2" />
                  <circle cx="150" cy="150" r="5" fill="#3478F6" className="dark:fill-[#4C8DFF]" />
                  <circle cx="150" cy="150" r="2" fill="#FFFFFF" opacity="0.9" />
                </svg>
              </div>

              {/* Center subtle pulse when concept is active */}
              {effectiveConcept && (
                <div className="absolute w-12 h-12 rounded-full border border-blue-500/30 dark:border-teal-400/30 animate-ping opacity-25 pointer-events-none" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
