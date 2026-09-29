import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TelemetryRibbon } from './components/TelemetryRibbon';
import { ArticleInput } from './components/ArticleInput';
import { AlgorithmSelector } from './components/AlgorithmSelector';
import { ResultsDisplay } from './components/ResultsDisplay';
import { ComparisonView } from './components/ComparisonView';
import { NeuralConstellation } from './components/NeuralConstellation';
import { extractKeywords, compareMethods } from './services/api';
import { ExtractionResponse, ComparisonResponse } from './types';
import { AlertCircle, Sparkles, Layers, Sliders, FileText } from 'lucide-react';

const SAMPLE_ARTICLES: Record<string, string> = {
  ai: `Artificial intelligence (AI) and natural language processing (NLP) have revolutionized modern computational linguistics and automated text analysis. Natural language processing encompasses tokenization, lemmatization, stop-word filtering, term frequency-inverse document frequency (TF-IDF), graph-based ranking such as TextRank, and rapid automatic keyword extraction (RAKE). Machine learning algorithms and transformer neural networks enable high-precision sentiment analysis, keyphrase extraction, vector embeddings, and semantic similarity scoring across large text corpora. Modern key phrase extractors utilize hybrid scoring frameworks to combine statistical term frequency with graph centrality for optimal domain representation.`,
  
  climate: `Global climate change represents one of the most critical environmental challenges of modern science. Renewable energy transition, atmospheric greenhouse gas emissions, carbon sequestration, and global surface temperature anomalies are central indicators monitored by climate models. Decarbonization strategies focus on photovoltaic solar power generation, offshore wind energy infrastructure, electric vehicle adoption, and industrial energy efficiency. International agreements aim to limit global warming below pre-industrial thresholds through strict emissions reduction targets and sustainable resource management across urban centers.`,
  
  quantum: `Quantum computing leverages fundamental principles of quantum mechanics including superposition, quantum entanglement, and quantum interference to process information fundamentally faster than classical supercomputers. Quantum bits or qubits permit simultaneous execution of complex computational algorithms. Fault-tolerant quantum processors, superconducting circuits, and trapped-ion systems enable breakthrough applications in quantum cryptography, molecular chemistry modeling, combinatorial optimization, and quantum machine learning. Quantum supremacy demonstrations highlight the potential of quantum algorithms in breaking RSA encryption and accelerating material science discovery.`,

  neuro: `Neuroscience and brain-computer interfaces (BCIs) are rapidly advancing neural signal decoding and cognitive prosthetics. Electroencephalography (EEG) and intracranial electrocorticography record neural spike trains and oscillatory rhythms across the motor cortex. Deep neural networks decode intent from neural population dynamics to control robotic limbs and restore vocal synthesis. Neuroplasticity, synaptic pruning, and optogenetic stimulation allow researchers to map functional connectomes and investigate neurodegenerative diseases like Alzheimer's and Parkinson's with cellular resolution.`,
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

  // Automatically trigger analysis on initial mount and tab switch
  useEffect(() => {
    handleRunAnalysis();
    // eslint-disable-next-deps
  }, [activeTab]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      
      {/* Interactive Neural Constellation Graph Background */}
      <NeuralConstellation />

      {/* Universal Sticky Navbar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        
        {/* Error Alert (if any) */}
        {error && (
          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: Precision Dual-Pane Single Extractor Studio */}
        {activeTab === 'extract' && (
          <div className="space-y-4">
            
            {/* Symmetrical 1-Line Telemetry Ribbon */}
            <TelemetryRibbon
              stats={extractResult ? extractResult.statistics : null}
              processingTimeMs={extractResult?.processing_time_ms}
              method={method}
              topN={topN}
            />

            {/* Symmetrical 50/50 Dual Panes (Aligned heights) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              
              {/* LEFT PANE: Configuration & Source Canvas */}
              <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col space-y-4 h-full">
                
                {/* Pane Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-brand-500" />
                    <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      Model & Source Input
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Step 1 · Configure & Ingest
                  </span>
                </div>

                {/* Algorithm Selector Bar */}
                <AlgorithmSelector
                  method={method}
                  setMethod={setMethod}
                  topN={topN}
                  setTopN={setTopN}
                  weights={weights}
                  setWeights={setWeights}
                />

                {/* Document Editor Canvas */}
                <div className="flex-1 flex flex-col pt-1">
                  <ArticleInput
                    text={text}
                    setText={setText}
                    onAnalyze={handleRunAnalysis}
                    loading={loading}
                    onSampleSelect={handleSampleSelect}
                  />
                </div>

              </div>

              {/* RIGHT PANE: Extraction Intelligence & Visualization */}
              <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col space-y-4 h-full">
                
                {/* Pane Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      Extracted Intelligence
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Step 2 · Insights & Export
                  </span>
                </div>

                {/* Results Display or Empty/Loading State */}
                <div className="flex-1 flex flex-col">
                  {extractResult && extractResult.keywords.length > 0 ? (
                    <ResultsDisplay
                      keywords={extractResult.keywords}
                      methodName={extractResult.method}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 opacity-40 text-brand-500" />
                      <p className="text-xs">No key phrases extracted yet.</p>
                      <p className="text-[11px] text-slate-500">
                        Click "Extract Key Phrases" to analyze the document.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* MODE 2: Multi-Algorithm Comparative Benchmark */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            
            {/* Input Ingestion Card for Compare Mode */}
            <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    Comparative Document Source
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Simultaneous 4-Model Execution
                </span>
              </div>

              <ArticleInput
                text={text}
                setText={setText}
                onAnalyze={handleRunAnalysis}
                loading={loading}
                onSampleSelect={handleSampleSelect}
              />
            </div>

            {/* Benchmark Analysis Results */}
            {comparisonResult && (
              <ComparisonView data={comparisonResult} />
            )}

          </div>
        )}

      </main>

      {/* Symmetrical Minimalist Footer */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/70 py-4 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xs mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">KeyLens NLP Engine</span>
            <span>·</span>
            <span>TF-IDF · RAKE · TextRank · Hybrid</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            FastAPI + React 18 + TypeScript + Tailwind
          </div>
        </div>
      </footer>

    </div>
  );
};
