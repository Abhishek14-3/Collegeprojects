import React from 'react';
import { ComparisonResponse } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { GitCompare, Flame, Clock, Layers, CheckCircle2 } from 'lucide-react';

interface ComparisonViewProps {
  data: ComparisonResponse;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
  const methodNames: Record<string, string> = {
    hybrid: 'Hybrid Model',
    tfidf: 'TF-IDF Statistical',
    rake: 'RAKE Co-occurrence',
    textrank: 'TextRank PageRank',
  };

  const methodColors: Record<string, string> = {
    hybrid: '#0c8ee9',
    tfidf: '#38bdf8',
    rake: '#a855f7',
    textrank: '#10b981',
  };

  // Calculate consensus phrases across methods
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

  const chartData = consensusPhrases.slice(0, 8).map((cp) => {
    const entry: any = { name: cp.phrase.length > 16 ? cp.phrase.slice(0, 14) + '..' : cp.phrase };
    Object.keys(data.results).forEach((m) => {
      const found = data.results[m].find((item) => item.phrase.toLowerCase() === cp.phrase);
      entry[m] = found ? parseFloat((found.score * 100).toFixed(1)) : 0;
    });
    return entry;
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Top Telemetry Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          
          <div className="flex items-center space-x-3 sm:pr-4">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Method Consensus</div>
              <div className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                {consensusPhrases.length} overlapping phrases
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:px-4 pt-2 sm:pt-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Tested Models</div>
              <div className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                4 NLP Algorithms
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:pl-4 pt-2 sm:pt-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Total Benchmark Latency</div>
              <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                {data.processing_time_ms.toFixed(1)} ms
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Consensus Breakdown Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Multi-Algorithm Consensus Breakdown Score (%)</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Found by 2+ models</span>
          </div>
          
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="hybrid" name="Hybrid" fill={methodColors.hybrid} radius={[3, 3, 0, 0]} />
                <Bar dataKey="tfidf" name="TF-IDF" fill={methodColors.tfidf} radius={[3, 3, 0, 0]} />
                <Bar dataKey="rake" name="RAKE" fill={methodColors.rake} radius={[3, 3, 0, 0]} />
                <Bar dataKey="textrank" name="TextRank" fill={methodColors.textrank} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Symmetrical 4-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(data.results).map(([mKey, keywords]) => (
          <div
            key={mKey}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col space-y-2.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-display font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: methodColors[mKey] }} />
                {methodNames[mKey]}
              </span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {keywords.length} phrases
              </span>
            </div>

            {/* List */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {keywords.map((item) => (
                <div
                  key={item.rank}
                  className="p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="font-mono text-slate-400 text-[10px] w-4">
                      #{item.rank}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">
                      {item.phrase}
                    </span>
                  </div>
                  <span className="font-mono text-brand-600 dark:text-brand-400 font-bold text-[10px] shrink-0 ml-1">
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
