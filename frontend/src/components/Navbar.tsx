import React, { useEffect, useState } from 'react';
import { Sparkles, Activity, Moon, Sun, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { checkHealth } from '../services/api';
import { HealthResponse } from '../types';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode }) => {
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5 animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                KeyLens
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                NLP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              High-Precision Keyword & Key-Phrase Extractor
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Health status badge */}
          <button
            onClick={fetchHealth}
            title="Backend API Connection Status (Click to Refresh)"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            {loadingHealth ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />
            ) : errorStatus ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden md:inline text-red-500">API Offline</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline text-emerald-600 dark:text-emerald-400">API Connected</span>
              </>
            )}
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
