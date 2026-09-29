import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, Sparkles, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { uploadDocument } from '../services/api';

interface ArticleInputProps {
  text: string;
  setText: (val: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  onSampleSelect: (sampleKey: string) => void;
  selectedSample?: string;
}

export const ArticleInput: React.FC<ArticleInputProps> = ({
  text,
  setText,
  onAnalyze,
  loading,
  onSampleSelect,
  selectedSample = 'ai',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    setIsDragOver(false);
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

  const samplePresets = [
    { key: 'ai', label: 'AI & NLP' },
    { key: 'climate', label: 'Climate' },
    { key: 'quantum', label: 'Quantum' },
    { key: 'neuro', label: 'Neuroscience' },
  ];

  return (
    <div className="flex flex-col h-full space-y-3">
      
      {/* Top Presets bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
          Sample Articles:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {samplePresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onSampleSelect(preset.key)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700/60 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Dropzone Canvas */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex-1 min-h-[300px] rounded-xl border transition-all duration-200 flex flex-col bg-slate-50/50 dark:bg-slate-950/60 ${
          isDragOver 
            ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-500/5' 
            : 'border-slate-200 dark:border-slate-800 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20'
        }`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your article text here, or drag & drop a document (.txt, .pdf, .docx)..."
          className="w-full flex-1 p-4 bg-transparent resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none text-xs sm:text-sm leading-relaxed font-sans"
        />

        {uploading && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm rounded-xl flex items-center justify-center space-x-2 text-white z-10">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-sm font-medium">Extracting text from document...</span>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center space-x-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        
        {/* Left Actions: Upload & Clear */}
        <div className="flex items-center space-x-2">
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
            title="Upload .txt, .pdf, or .docx"
          >
            <Upload className="w-3.5 h-3.5 text-brand-500" />
            <span>Upload File</span>
          </button>

          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
              title="Clear editor text"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || wordCount < 3}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-sky-400 text-white font-semibold shadow-md shadow-brand-500/20 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 text-xs sm:text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing NLP...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Extract Key Phrases</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </>
          )}
        </button>

      </div>

    </div>
  );
};
