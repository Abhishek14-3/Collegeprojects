import React, { useEffect, useState } from 'react';
import { Sparkles, Activity, Moon, Sun, CheckCircle2, XCircle, RefreshCw, FileText, GitCompare } from 'lucide-react';
import { checkHealth } from '../services/api';
import { HealthResponse } from '../types';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: 'extract' | 'compare';
  setActiveTab: (tab: 'extract' | 'compare') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
}) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [errorStatus, setErrorStatus] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setErrorStatus(false);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setErrorStatus(true);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 py-2.5 flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-brand-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              KeyLens
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              v1.0
            </span>
          </div>
        </div>

        {/* Center: Main Mode Switcher Segmented Control */}
        <div className="p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center">
          <button
            type="button"
            onClick={() => setActiveTab('extract')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'extract'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-brand-500" />
            <span>Single Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-purple-500" />
            <span>Compare 4 Models</span>
          </button>
        </div>

        {/* Right: Health Badge & Theme Toggle */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Health Status Button */}
          <button
            onClick={fetchHealth}
            title="Backend API Status (Click to Refresh)"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/80 transition"
          >
            {loadingHealth ? (
              <RefreshCw className="w-3 h-3 animate-spin text-brand-500" />
            ) : errorStatus ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="hidden md:inline text-[11px] text-red-500 font-mono">Offline</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden md:inline text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">Connected</span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

        </div>

      </div>
    </header>
  );
};
