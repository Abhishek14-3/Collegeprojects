export interface KeywordItem {
  phrase: string;
  score: number;
  raw_score?: number;
  frequency: number;
  rank: number;
  methods?: string[];
}

export interface ArticleStatistics {
  word_count: number;
  unique_words: number;
  sentence_count: number;
  character_count: number;
  avg_sentence_length: number;
}

export interface ExtractionRequest {
  text: string;
  method?: 'hybrid' | 'tfidf' | 'rake' | 'textrank';
  top_n?: number;
  weights?: Record<string, number>;
}

export interface ExtractionResponse {
  success: boolean;
  method: string;
  statistics: ArticleStatistics;
  keywords: KeywordItem[];
  processing_time_ms: number;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  text: string;
  word_count: number;
  file_type: string;
  message?: string;
}

export interface ComparisonResponse {
  success: boolean;
  statistics: ArticleStatistics;
  results: Record<string, KeywordItem[]>;
  processing_time_ms: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  available_methods: string[];
}
