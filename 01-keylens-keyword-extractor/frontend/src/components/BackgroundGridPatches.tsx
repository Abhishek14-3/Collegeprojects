import React from 'react';

export const BackgroundGridPatches: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 
        Full-Page Continuous Architectural Grid 
        Uses repeating SVG patterns with fine 1px lines and crosshair intersections
      */}
      <svg 
        className="absolute inset-0 w-full h-full stroke-slate-400/20 dark:stroke-slate-700/25"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Small 24px x 24px cell grid pattern */}
          <pattern 
            id="keylens-base-grid" 
            width="28" 
            height="28" 
            patternUnits="userSpaceOnUse"
          >
            <path 
              d="M 28 0 L 0 0 0 28" 
              fill="none" 
              strokeWidth="1" 
            />
          </pattern>

          {/* Major 112px x 112px crosshair grid pattern */}
          <pattern 
            id="keylens-major-grid" 
            width="112" 
            height="112" 
            patternUnits="userSpaceOnUse"
          >
            <rect width="112" height="112" fill="url(#keylens-base-grid)" />
            <path 
              d="M 112 0 L 0 0 0 112" 
              fill="none" 
              strokeWidth="1.2" 
              className="stroke-slate-400/35 dark:stroke-slate-600/35" 
            />
            {/* Crosshair at (0,0) */}
            <path 
              d="M -4 0 L 4 0 M 0 -4 L 0 4" 
              fill="none" 
              strokeWidth="1.2" 
              className="stroke-brand-500/50 dark:stroke-brand-400/50" 
            />
          </pattern>
        </defs>

        {/* Fill entire canvas with the grid */}
        <rect width="100%" height="100%" fill="url(#keylens-major-grid)" />
      </svg>

      {/* Subtle Radial Ambient Glow & Vignette */}
      <div 
        className="absolute inset-0 bg-radial from-brand-500/[0.03] via-transparent to-slate-900/[0.04] dark:to-slate-950/[0.25]" 
      />

      {/* Floating Monospaced NLP Annotations across outer margins */}
      <div className="absolute top-18 left-8 opacity-30 dark:opacity-25 font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden sm:block">
        NLP · CORPUS_01 · [x:00, y:28]
      </div>

      <div className="absolute top-20 right-10 opacity-30 dark:opacity-25 font-mono text-[9px] uppercase tracking-widest text-sky-600 dark:text-sky-400 hidden sm:block">
        TF-IDF · w(t,d) = tf · log(N/df)
      </div>

      <div className="absolute top-[45%] left-6 opacity-25 dark:opacity-20 font-mono text-[9px] uppercase tracking-widest text-purple-600 dark:text-purple-400 hidden lg:block">
        RAKE · deg(w)/freq(w)
      </div>

      <div className="absolute top-[55%] right-8 opacity-25 dark:opacity-20 font-mono text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hidden lg:block">
        TextRank · PR(V_i) = (1-d) + d·Σ(PR/Out)
      </div>

      <div className="absolute bottom-6 left-12 opacity-30 dark:opacity-25 font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden sm:block">
        HYBRID_SCORING · λ_comb(S_tfidf, S_rake, S_tr)
      </div>

      <div className="absolute bottom-6 right-12 opacity-30 dark:opacity-25 font-mono text-[9px] uppercase tracking-widest text-indigo-500 dark:text-indigo-400 hidden sm:block">
        KEYLENS // ENGINE_v1.0
      </div>

    </div>
  );
};
