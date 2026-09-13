import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ArticleInput } from './components/ArticleInput';
import { AlgorithmSelector } from './components/AlgorithmSelector';
import { StatsCards } from './components/StatsCards';
import { ResultsDisplay } from './components/ResultsDisplay';
import { PhraseCloud } from './components/PhraseCloud';
import { ComparisonView } from './components/ComparisonView';
import { extractKeywords, compareMethods } from './services/api';
import { ExtractionResponse, ComparisonResponse } from './types';
import { Sparkles, GitCompare, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const SAMPLE_ARTICLES: Record<string, string> = {
  ai: `Artificial intelligence (AI) and natural language processing (NLP) have revolutionized modern computational linguistics and automated text analysis. Natural language processing encompasses tokenization, lemmatization, stop-word filtering, term frequency-inverse document frequency (TF-IDF), graph-based ranking such as TextRank, and rapid automatic keyword extraction (RAKE). Machine learning algorithms and transformer neural networks enable high-precision sentiment analysis, keyphrase extraction, vector embeddings, and semantic similarity scoring across large text corpora. Modern key phrase extractors utilize hybrid scoring frameworks to combine statistical term frequency with graph centrality for optimal domain representation.`,
  
  climate: `Global climate change represents one of the most critical environmental challenges of modern science. Renewable energy transition, atmospheric greenhouse gas emissions, carbon sequestration, and global surface temperature anomalies are central indicators monitored by climate models. Decarbonization strategies focus on photovoltaic solar power generation, offshore wind energy infrastructure, electric vehicle adoption, and industrial energy efficiency. International agreements aim to limit global warming below pre-industrial thresholds through strict emissions reduction targets and sustainable resource management across urban centers.`,
  
  quantum: `Quantum computing leverages fundamental principles of quantum mechanics including superposition, quantum entanglement, and quantum interference to process information fundamentally faster than classical supercomputers. Quantum bits or qubits permit simultaneous execution of complex computational algorithms. Fault-tolerant quantum processors, superconducting circuits, and trapped-ion systems enable breakthrough applications in quantum cryptography, molecular chemistry modeling, combinatorial optimization, and quantum machine learning. Quantum supremacy demonstrations highlight the potential of quantum algorithms in breaking RSA encryption and accelerating material science discovery.`,
};

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'extract' | 'compare'>('extract');

  const [text, setText] = useState(SAMPLE_ARTICLES.ai);
  const [method, setMethod] = useState<'hybrid' | 'tfidf' | 'rake' | 'textrank'>('hybrid');
  const [topN, setTopN] = useState(12);
  const [weights, setWeights] = useState({ tfidf: 0.4, rake: 0.3, textrank: 0.3 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [extractResult, setExtractResult] = useState<ExtractionResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);

  // Sync dark class on html root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSampleSelect = (sampleKey: string) => {
    if (SAMPLE_ARTICLES[sampleKey]) {
      setText(SAMPLE_ARTICLES[sampleKey]);
      setError(null);
    }
  };

  const handleRunAnalysis = async () => {
    if (!text.trim() || text.trim().length < 10) {
      setError('Article text must contain at least 10 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'extract') {
        const res = await extractKeywords({
          text,
          method,
          top_n: topN,
          weights,
        });
        setExtractResult(res);
      } else {
        const res = await compareMethods({
          text,
          top_n: topN,
          weights,
        });
        setComparisonResult(res);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during keyword extraction.');
    } finally {
      setLoading(false);
    }
  };

  // Automatically trigger analysis on initial mount
  useEffect(() => {
    handleRunAnalysis();
    // eslint-disable-next-deps
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('extract')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'extract'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Single Extractor</span>
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'compare'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare 4 Algorithms</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden md:block">
            Powered by TF-IDF, RAKE, TextRank & Hybrid NLP
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Input & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ArticleInput
              text={text}
              setText={setText}
              onAnalyze={handleRunAnalysis}
              loading={loading}
              onSampleSelect={handleSampleSelect}
            />
          </div>

          <div>
            <AlgorithmSelector
              method={method}
              setMethod={setMethod}
              topN={topN}
              setTopN={setTopN}
              weights={weights}
              setWeights={setWeights}
            />
          </div>
        </div>

        {/* Section 2: Results Display */}
        {activeTab === 'extract' ? (
          extractResult && (
            <div className="space-y-6">
              <StatsCards
                stats={extractResult.statistics}
                processingTimeMs={extractResult.processing_time_ms}
                method={extractResult.method}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ResultsDisplay
                    keywords={extractResult.keywords}
                    methodName={extractResult.method}
                  />
                </div>

                <div>
                  <PhraseCloud keywords={extractResult.keywords} />
                </div>
              </div>
            </div>
          )
        ) : (
          comparisonResult && <ComparisonView data={comparisonResult} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
          KeyLens NLP Keyword & Key-Phrase Extraction Engine • Built with FastAPI & React
        </div>
      </footer>
    </div>
  );
};
