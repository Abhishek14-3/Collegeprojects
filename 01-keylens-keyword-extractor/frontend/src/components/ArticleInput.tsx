import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

interface ArticleInputProps {
  text: string;
  setText: (val: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  onSampleSelect: (sampleKey: string) => void;
}

export const ArticleInput: React.FC<ArticleInputProps> = ({
  text,
  setText,
  onAnalyze,
  loading,
  onSampleSelect
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const resp = await uploadDocument(file);
      if (resp.text) {
        setText(resp.text);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const resp = await uploadDocument(file);
      if (resp.text) {
        setText(resp.text);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error parsing dropped file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-lg">
            Article & Document Input
          </h2>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Samples:
          </span>
          <button
            type="button"
            onClick={() => onSampleSelect('ai')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 transition"
          >
            AI & NLP
          </button>
          <button
            type="button"
            onClick={() => onSampleSelect('climate')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 transition"
          >
            Climate Science
          </button>
          <button
            type="button"
            onClick={() => onSampleSelect('quantum')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 transition"
          >
            Quantum Tech
          </button>
        </div>
      </div>

      {/* Main Textarea with File Drag & Drop zone */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative group rounded-xl border border-slate-200 dark:border-slate-800 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 bg-slate-50/50 dark:bg-slate-950/50 transition"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your article text here, or drag & drop a file (.txt, .pdf, .docx)..."
          rows={10}
          className="w-full p-4 bg-transparent resize-y text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm sm:text-base leading-relaxed"
        />

        {uploading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-xl flex items-center justify-center space-x-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-sm font-medium">Extracting text from file...</span>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center space-x-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Input Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        
        {/* File upload button & Counters */}
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.pdf,.docx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
          >
            <Upload className="w-3.5 h-3.5 text-brand-500" />
            <span>Upload Document</span>
          </button>

          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-red-500 transition"
              title="Clear text"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 ml-auto sm:ml-0 font-mono">
            {wordCount} words | {charCount} chars
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || wordCount < 3}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 text-white font-medium shadow-lg shadow-brand-500/25 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing NLP...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Extract Key Phrases</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
};
