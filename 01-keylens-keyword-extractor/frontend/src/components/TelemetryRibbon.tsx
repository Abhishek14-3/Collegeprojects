import React from 'react';
import { ArticleStatistics } from '../types';
import { FileText, Hash, Layers, Zap, Cpu, Sparkles } from 'lucide-react';

interface TelemetryRibbonProps {
  stats: ArticleStatistics | null;
  processingTimeMs?: number;
  method?: string;
  topN?: number;
}

export const TelemetryRibbon: React.FC<TelemetryRibbonProps> = ({
  stats,
  processingTimeMs,
  method = 'hybrid',
  topN = 12,
}) => {
  const methodNames: Record<string, string> = {
    hybrid: 'Hybrid NLP',
    tfidf: 'TF-IDF Statistical',
    rake: 'RAKE Co-occurrence',
    textrank: 'TextRank PageRank',
  };

  const methodColors: Record<string, string> = {
    hybrid: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    tfidf: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    rake: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    textrank: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  };

  return (
    <div className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs">
        
        {/* Left: Document Metrics Group */}
        <div className="flex items-center flex-wrap gap-x-5 gap-y-1 divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Word Count */}
          <div className="flex items-center space-x-2">
            <FileText className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-slate-500 dark:text-slate-400">Words:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {stats ? stats.word_count.toLocaleString() : '—'}
            </span>
            {stats && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({stats.unique_words.toLocaleString()} uniq)
              </span>
            )}
          </div>

          {/* Sentences */}
          <div className="flex items-center space-x-2 pl-4">
            <Hash className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-500 dark:text-slate-400">Sentences:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {stats ? stats.sentence_count.toLocaleString() : '—'}
            </span>
            {stats && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({stats.avg_sentence_length.toFixed(1)} w/s)
              </span>
            )}
          </div>

          {/* Characters */}
          <div className="flex items-center space-x-2 pl-4">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-slate-500 dark:text-slate-400">Chars:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {stats ? stats.character_count.toLocaleString() : '—'}
            </span>
          </div>

        </div>

        {/* Right: Runtime & Model Indicator */}
        <div className="flex items-center space-x-3 ml-auto sm:ml-0">
          
          {/* Latency */}
          {processingTimeMs !== undefined && (
            <div className="flex items-center space-x-1.5 font-mono text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700/60">
              <Zap className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>{processingTimeMs.toFixed(1)} ms</span>
            </div>
          )}

          {/* Active Model Pill */}
          <div className="flex items-center space-x-1.5 font-mono text-[11px] px-2.5 py-1 rounded-md border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
            <Cpu className="w-3 h-3 text-brand-500" />
            <span>{methodNames[method] || method.toUpperCase()}</span>
            <span className="text-slate-400">·</span>
            <span className="text-brand-600 dark:text-brand-400 font-semibold">Top {topN}</span>
          </div>

        </div>

      </div>
    </div>
  );
};
