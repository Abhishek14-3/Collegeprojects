import React, { useState } from 'react';
import { KeywordItem } from '../types';
import { Search, Download, Copy, Check, Award, List, Cloud, BarChart2, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ResultsDisplayProps {
  keywords: KeywordItem[];
  methodName: string;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ keywords, methodName }) => {
  const [activeView, setActiveView] = useState<'list' | 'cloud' | 'chart'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const filteredKeywords = keywords.filter((item) =>
    item.phrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (phrase: string, index: number) => {
    navigator.clipboard.writeText(phrase);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const allPhrases = keywords.map((k) => `${k.rank}. ${k.phrase} (${(k.score * 100).toFixed(1)}%)`).join('\n');
    navigator.clipboard.writeText(allPhrases);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keywords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `keylens_${methodName.toLowerCase()}_keywords.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    const headers = "Rank,Phrase,Score,Frequency,Raw Score\n";
    const rows = keywords
      .map(k => `${k.rank},"${k.phrase.replace(/"/g, '""')}",${k.score.toFixed(4)},${k.frequency},${k.raw_score?.toFixed(4) || 0}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `keylens_${methodName.toLowerCase()}_keywords.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = keywords.slice(0, 10).map((k) => ({
    name: k.phrase.length > 18 ? k.phrase.slice(0, 16) + '...' : k.phrase,
    score: parseFloat((k.score * 100).toFixed(1)),
  }));

  const maxScore = Math.max(...keywords.map((k) => k.score), 0.01);
  const minScore = Math.min(...keywords.map((k) => k.score), 0);

  const cloudGradients = [
    'from-sky-400 to-brand-500',
    'from-indigo-400 to-purple-400',
    'from-violet-400 to-fuchsia-400',
    'from-emerald-400 to-teal-400',
    'from-amber-400 to-orange-400',
  ];

  return (
    <div className="flex flex-col h-full space-y-3">
      
      {/* Top Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
        
        {/* Left: View Mode Segmented Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              activeView === 'list'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('cloud')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              activeView === 'cloud'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('chart')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              activeView === 'chart'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Chart</span>
          </button>
        </div>

        {/* Right: Search Filter & Export Actions */}
        <div className="flex items-center space-x-1.5">
          
          {/* Search filter */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-200 w-24 sm:w-32 font-sans"
            />
          </div>

          {/* Copy All */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
            title="Copy all phrases"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* CSV Export */}
          <button
            type="button"
            onClick={exportCSV}
            className="px-2 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1"
            title="Download CSV"
          >
            <Download className="w-3 h-3 text-emerald-500" />
            <span>CSV</span>
          </button>

          {/* JSON Export */}
          <button
            type="button"
            onClick={exportJSON}
            className="px-2 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1"
            title="Download JSON"
          >
            <Download className="w-3 h-3 text-sky-500" />
            <span>JSON</span>
          </button>

        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[360px] overflow-hidden flex flex-col">
        
        {/* VIEW 1: Ranked List */}
        {activeView === 'list' && (
          filteredKeywords.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              No key phrases match "{searchTerm}".
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[460px]">
              {filteredKeywords.map((item, index) => {
                const pct = Math.min(100, Math.max(8, Math.round(item.score * 100)));
                const isRank1 = item.rank === 1;
                const isRank2 = item.rank === 2;
                const isRank3 = item.rank === 3;

                return (
                  <div
                    key={index}
                    className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                      isRank1
                        ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10'
                        : isRank2
                        ? 'border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/5'
                        : isRank3
                        ? 'border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/5'
                        : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Rank badge & phrase */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      
                      {/* Monospaced Rank Badge */}
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                          isRank1
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : isRank2
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                            : isRank3
                            ? 'bg-indigo-600/80 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.rank < 10 ? `0${item.rank}` : item.rank}
                      </span>

                      {/* Phrase & Progress bar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                            {item.phrase}
                          </span>
                          {item.methods && item.methods.length > 0 && (
                            <div className="hidden sm:flex gap-1">
                              {item.methods.map((m) => (
                                <span key={m} className="px-1 py-0.2 text-[8px] font-mono font-bold uppercase rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-[200px] bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-sky-400 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                    </div>

                    {/* Right: Score & Copy action */}
                    <div className="flex items-center space-x-2.5 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
                          {(item.score * 100).toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          freq: {item.frequency}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.phrase, index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Copy Phrase"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )
        )}

        {/* VIEW 2: Phrase Cloud */}
        {activeView === 'cloud' && (
          <div className="flex-1 flex flex-wrap items-center justify-center content-center gap-2.5 p-6 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80 overflow-y-auto">
            {keywords.map((item, idx) => {
              const norm = maxScore === minScore ? 1 : (item.score - minScore) / (maxScore - minScore);
              const fontSizePx = Math.round(12 + norm * 14); // 12px to 26px
              const gradient = cloudGradients[idx % cloudGradients.length];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCopy(item.phrase, idx)}
                  title={`Rank #${item.rank} · Score: ${(item.score * 100).toFixed(1)}% · Frequency: ${item.frequency}`}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/50 hover:scale-105 transition-all shadow-xs"
                >
                  <span
                    className={`font-semibold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                    style={{ fontSize: `${fontSizePx}px` }}
                  >
                    {item.phrase}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* VIEW 3: Score Distribution Chart */}
        {activeView === 'chart' && (
          <div className="flex-1 p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex flex-col justify-center">
            <div className="text-[11px] font-semibold text-slate-500 mb-2">
              Top 10 Keyphrase Score Curve (%)
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
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
                  <Bar dataKey="score" name="Relevance Score (%)" fill="#0c8ee9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
