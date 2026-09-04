import React from 'react';
import { ComparisonResponse, KeywordItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { GitCompare, CheckCircle, Flame, Layers } from 'lucide-react';

interface ComparisonViewProps {
  data: ComparisonResponse;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
  const methodNames: Record<string, string> = {
    hybrid: 'Hybrid Model',
    tfidf: 'TF-IDF',
    rake: 'RAKE',
    textrank: 'TextRank',
  };

  const methodColors: Record<string, string> = {
    hybrid: '#0c8ee9',
    tfidf: '#0284c7',
    rake: '#8b5cf6',
    textrank: '#10b981',
  };

  // Find phrases present in multiple methods
  const phraseCounts: Record<string, { count: number; methods: string[]; avgScore: number }> = {};

  Object.entries(data.results).forEach(([methodKey, list]) => {
    list.forEach((item) => {
      const p = item.phrase.toLowerCase();
      if (!phraseCounts[p]) {
        phraseCounts[p] = { count: 0, methods: [], avgScore: 0 };
      }
      phraseCounts[p].count += 1;
      phraseCounts[p].methods.push(methodKey);
      phraseCounts[p].avgScore += item.score;
    });
  });

  const consensusPhrases = Object.entries(phraseCounts)
    .filter(([_, info]) => info.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([phrase, info]) => ({
      phrase,
      count: info.count,
      methods: info.methods,
      score: info.avgScore / info.count,
    }));

  // Recharts data preparation: Top 10 phrases by highest average score across methods
  const chartData = consensusPhrases.slice(0, 8).map((cp) => {
    const entry: any = { name: cp.phrase };
    Object.keys(data.results).forEach((m) => {
      const found = data.results[m].find((item) => item.phrase.toLowerCase() === cp.phrase);
      entry[m] = found ? parseFloat((found.score * 100).toFixed(1)) : 0;
    });
    return entry;
  });

  return (
    <div className="space-y-6">
      
      {/* Overview Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-brand-500" />
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-lg">
              Multi-Algorithm Comparative Benchmark
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 font-semibold">
            {data.processing_time_ms.toFixed(1)} ms total time
          </span>
        </div>

        {/* High consensus summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Method Consensus</div>
            <div className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">
              {consensusPhrases.length} overlapping phrases
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Found by 2+ algorithms</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Document Length</div>
            <div className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">
              {data.statistics.word_count} words
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{data.statistics.sentence_count} sentences</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Tested Algorithms</div>
            <div className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">
              4 Methods
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Hybrid, TF-IDF, RAKE, TextRank</div>
          </div>
        </div>
      </div>

      {/* Chart visualization */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
          <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            Top Keyphrase Consensus Score Breakdown Across Algorithms (%)
          </h4>
          
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="hybrid" name="Hybrid" fill={methodColors.hybrid} radius={[4, 4, 0, 0]} />
                <Bar dataKey="tfidf" name="TF-IDF" fill={methodColors.tfidf} radius={[4, 4, 0, 0]} />
                <Bar dataKey="rake" name="RAKE" fill={methodColors.rake} radius={[4, 4, 0, 0]} />
                <Bar dataKey="textrank" name="TextRank" fill={methodColors.textrank} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Side-by-Side 4-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.results).map(([mKey, keywords]) => (
          <div
            key={mKey}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: methodColors[mKey] }} />
                {methodNames[mKey]}
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {keywords.length} items
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {keywords.map((item) => (
                <div
                  key={item.rank}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-mono font-semibold text-slate-400 text-[11px]">
                      #{item.rank}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.phrase}
                    </span>
                  </div>
                  <span className="font-mono text-brand-600 dark:text-brand-400 font-semibold text-[11px] shrink-0 ml-1">
                    {(item.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
