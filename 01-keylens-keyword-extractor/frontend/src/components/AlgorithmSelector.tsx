import React, { useState } from 'react';
import { Sliders, Cpu, Sparkles, Zap, ChevronDown, RotateCcw } from 'lucide-react';

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
      name: 'Hybrid NLP',
      shortName: 'Hybrid',
      badge: 'Best Accuracy',
      desc: 'Blends TF-IDF + RAKE + TextRank',
      color: 'from-brand-500 to-indigo-500',
      activeBorder: 'border-brand-500 bg-brand-500/10 text-brand-500',
    },
    {
      id: 'tfidf',
      name: 'TF-IDF',
      shortName: 'TF-IDF',
      badge: 'Statistical',
      desc: 'Term Frequency & Sublinear IDF',
      color: 'from-sky-500 to-blue-600',
      activeBorder: 'border-sky-500 bg-sky-500/10 text-sky-400',
    },
    {
      id: 'rake',
      name: 'RAKE',
      shortName: 'RAKE',
      badge: 'Co-occurrence',
      desc: 'Rapid Automatic Keyword Extraction',
      color: 'from-violet-500 to-purple-600',
      activeBorder: 'border-purple-500 bg-purple-500/10 text-purple-400',
    },
    {
      id: 'textrank',
      name: 'TextRank',
      shortName: 'TextRank',
      badge: 'PageRank Graph',
      desc: 'Graph Centrality & Word Co-occurrence',
      color: 'from-emerald-500 to-teal-600',
      activeBorder: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
    },
  ];

  const resetWeights = () => {
    setWeights({ tfidf: 0.4, rake: 0.3, textrank: 0.3 });
  };

  return (
    <div className="space-y-3">
      
      {/* Segmented Algorithm Switcher Bar */}
      <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-1">
        {algorithms.map((alg) => {
          const isSelected = method === alg.id;
          return (
            <button
              key={alg.id}
              type="button"
              onClick={() => setMethod(alg.id as any)}
              className={`relative px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex flex-col items-center justify-center text-center ${
                isSelected
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                {alg.id === 'hybrid' && <Sparkles className="w-3 h-3 text-brand-500 shrink-0" />}
                <span>{alg.shortName}</span>
              </div>
              <span className={`text-[10px] font-normal font-mono ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {alg.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top N Slider & Hybrid Weights Drawer Trigger */}
      <div className="flex items-center justify-between gap-4 px-1 text-xs">
        
        {/* Top N Phrase Count */}
        <div className="flex-1 flex items-center space-x-3">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Top Phrases:
          </span>
          <input
            type="range"
            min={3}
            max={30}
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value))}
            className="w-full max-w-[140px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-xs px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 shrink-0">
            {topN}
          </span>
        </div>

        {/* Weights config toggle for Hybrid */}
        {method === 'hybrid' && (
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 transition shrink-0"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvanced ? 'Hide Weights' : 'Tune Weights'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        )}

      </div>

      {/* Expandable Hybrid Weights Controller */}
      {showAdvanced && method === 'hybrid' && (
        <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span>Hybrid Scoring Weights:</span>
            <button
              type="button"
              onClick={resetWeights}
              className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition text-[10px]"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset (40/30/30)</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span>TF-IDF</span>
                <span className="font-mono font-bold text-sky-400">{weights.tfidf.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.tfidf}
                onChange={(e) => setWeights({ ...weights, tfidf: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span>RAKE</span>
                <span className="font-mono font-bold text-purple-400">{weights.rake.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.rake}
                onChange={(e) => setWeights({ ...weights, rake: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span>TextRank</span>
                <span className="font-mono font-bold text-emerald-400">{weights.textrank.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights.textrank}
                onChange={(e) => setWeights({ ...weights, textrank: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
