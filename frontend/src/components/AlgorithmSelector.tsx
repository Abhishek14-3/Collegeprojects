import React, { useState } from 'react';
import { Sliders, Cpu, Info, Zap } from 'lucide-react';

interface AlgorithmSelectorProps {
  method: 'hybrid' | 'tfidf' | 'rake' | 'textrank';
  setMethod: (m: 'hybrid' | 'tfidf' | 'rake' | 'textrank') => void;
  topN: number;
  setTopN: (n: number) => void;
  weights: { tfidf: number; rake: number; textrank: number };
  setWeights: (w: { tfidf: number; rake: number; textrank: number }) => void;
}

export const AlgorithmSelector: React.FC<AlgorithmSelectorProps> = ({
  method,
  setMethod,
  topN,
  setTopN,
  weights,
  setWeights,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const algorithms = [
    {
      id: 'hybrid',
      name: 'Hybrid',
      desc: 'Combines TF-IDF, RAKE & TextRank for maximum precision & recall.',
      badge: 'RECOMMENDED',
      color: 'from-brand-500 to-indigo-500',
    },
    {
      id: 'tfidf',
      name: 'TF-IDF',
      desc: 'Statistical term frequency & sublinear inverse document frequency.',
      badge: 'FAST',
      color: 'from-sky-500 to-blue-600',
    },
    {
      id: 'rake',
      name: 'RAKE',
      desc: 'Rapid Automatic Keyword Extraction based on co-occurrence graph.',
      badge: 'MULTI-WORD',
      color: 'from-violet-500 to-purple-600',
    },
    {
      id: 'textrank',
      name: 'TextRank',
      desc: 'Graph-based PageRank adaptation for keyphrase centrality.',
      badge: 'GRAPH MODEL',
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-brand-500" />
          <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-lg">
            Algorithm & Extraction Parameters
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide Custom Weights' : 'Custom Weights'}</span>
        </button>
      </div>

      {/* Algorithm Radio Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {algorithms.map((alg) => {
          const isSelected = method === alg.id;
          return (
            <div
              key={alg.id}
              onClick={() => setMethod(alg.id as any)}
              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                isSelected
                  ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10 shadow-md ring-1 ring-brand-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${alg.color} shrink-0`} />
                    <span className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug">
                      {alg.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/50 shrink-0">
                    {alg.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                  {alg.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: Top N Slider */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          <label className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Target Phrase Count (Top N):</span>
          </label>
          <span className="font-mono text-brand-600 dark:text-brand-400 font-bold text-sm">
            {topN} phrases
          </span>
        </div>
        <input
          type="range"
          min={3}
          max={50}
          value={topN}
          onChange={(e) => setTopN(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>3 phrases</span>
          <span>25 phrases</span>
          <span>50 phrases</span>
        </div>
      </div>

      {/* Advanced Custom Weights sliders for Hybrid */}
      {showAdvanced && (
        <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-brand-500" />
            <span>Hybrid Component Weighting (Normalized):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>TF-IDF Weight</span>
                <span className="font-mono">{weights.tfidf.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.tfidf}
                onChange={(e) => setWeights({ ...weights, tfidf: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>RAKE Weight</span>
                <span className="font-mono">{weights.rake.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.rake}
                onChange={(e) => setWeights({ ...weights, rake: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                <span>TextRank Weight</span>
                <span className="font-mono">{weights.textrank.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.textrank}
                onChange={(e) => setWeights({ ...weights, textrank: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
