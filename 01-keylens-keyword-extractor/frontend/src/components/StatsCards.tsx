import React from 'react';
import { ArticleStatistics } from '../types';
import { AlignLeft, Hash, Layers, Clock, Sparkles } from 'lucide-react';

interface StatsCardsProps {
  stats: ArticleStatistics;
  processingTimeMs: number;
  method?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, processingTimeMs, method }) => {
  const cards = [
    {
      title: 'Word Count',
      value: stats.word_count.toLocaleString(),
      sub: `${stats.unique_words.toLocaleString()} unique terms`,
      icon: AlignLeft,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Sentences',
      value: stats.sentence_count.toLocaleString(),
      sub: `Avg length: ${stats.avg_sentence_length.toFixed(1)} words`,
      icon: Hash,
      color: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
    },
    {
      title: 'Total Characters',
      value: stats.character_count.toLocaleString(),
      sub: 'Including spaces & punct.',
      icon: Layers,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    },
    {
      title: 'NLP Runtime',
      value: `${processingTimeMs.toFixed(1)} ms`,
      sub: method ? `Method: ${method.toUpperCase()}` : 'Real-time execution',
      icon: Clock,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg border ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-slate-100">
              {card.value}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
