import React, { useState } from 'react';
import { KeywordItem } from '../types';
import { Search, Download, Copy, Check, Hash, Award, BarChart3, Filter } from 'lucide-react';

interface ResultsDisplayProps {
  keywords: KeywordItem[];
  methodName: string;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ keywords, methodName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const filteredKeywords = keywords.filter((item) =>
    item.phrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (phrase: string, index: number) => {
    navigator.clipboard.writeText(phrase);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
      
      {/* Top Header & Search/Export Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-lg">
              Extracted Key Phrases ({keywords.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ranked using <span className="font-semibold text-brand-600 dark:text-brand-400">{methodName.toUpperCase()}</span> algorithm
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter phrases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-200 w-36 sm:w-48"
            />
          </div>

          {/* CSV Export */}
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>CSV</span>
          </button>

          {/* JSON Export */}
          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-500" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Keywords List */}
      {filteredKeywords.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          No key phrases match "{searchTerm}".
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {filteredKeywords.map((item, index) => {
            const pct = Math.min(100, Math.max(8, Math.round(item.score * 100)));
            const isTop3 = item.rank <= 3;

            return (
              <div
                key={index}
                className={`group p-3 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                  isTop3
                    ? 'border-brand-500/30 bg-gradient-to-r from-brand-500/5 via-sky-500/5 to-transparent dark:from-brand-500/10 dark:via-sky-500/5'
                    : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {/* Left side: Rank badge & phrase */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                      item.rank === 1
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : item.rank === 2
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                        : item.rank === 3
                        ? 'bg-amber-700/80 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    #{item.rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-display font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                        {item.phrase}
                      </span>
                      {item.methods && item.methods.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {item.methods.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Score Bar */}
                    <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right side: Score & Frequency badges */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-semibold text-xs sm:text-sm text-brand-600 dark:text-brand-400">
                      {(item.score * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Freq: {item.frequency}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(item.phrase, index)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Copy Phrase"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
