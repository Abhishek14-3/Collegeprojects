import React from 'react';
import { KeywordItem } from '../types';
import { Cloud, Sparkles } from 'lucide-react';

interface PhraseCloudProps {
  keywords: KeywordItem[];
}

export const PhraseCloud: React.FC<PhraseCloudProps> = ({ keywords }) => {
  if (!keywords || keywords.length === 0) return null;

  const maxScore = Math.max(...keywords.map((k) => k.score), 0.01);
  const minScore = Math.min(...keywords.map((k) => k.score), 0);

  const colors = [
    'from-brand-500 to-sky-400 text-sky-400',
    'from-indigo-400 to-purple-400 text-indigo-400',
    'from-violet-400 to-fuchsia-400 text-violet-400',
    'from-emerald-400 to-teal-400 text-emerald-400',
    'from-amber-400 to-orange-400 text-amber-400',
    'from-blue-400 to-cyan-400 text-cyan-400',
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
      
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Cloud className="w-5 h-5 text-brand-500" />
        <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-lg">
          Interactive Phrase Cloud
        </h3>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-xl min-h-[220px]">
        {keywords.map((item, idx) => {
          const norm = maxScore === minScore ? 1 : (item.score - minScore) / (maxScore - minScore);
          const fontSizePx = Math.round(13 + norm * 18); // 13px to 31px
          const colorClass = colors[idx % colors.length];

          return (
            <span
              key={idx}
              title={`Rank #${item.rank} | Score: ${(item.score * 100).toFixed(1)}% | Frequency: ${item.frequency}`}
              className="inline-block transition-transform duration-200 hover:scale-110 cursor-pointer select-none font-medium"
              style={{ fontSize: `${fontSizePx}px` }}
            >
              <span className={`bg-gradient-to-r ${colorClass} bg-clip-text text-transparent opacity-90 hover:opacity-100`}>
                {item.phrase}
              </span>
            </span>
          );
        })}
      </div>

    </div>
  );
};
