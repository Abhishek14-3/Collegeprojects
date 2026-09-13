from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class ExtractionRequest(BaseModel):
    text: str = Field(..., description="Article text to analyze", min_length=10)
    method: str = Field(default="hybrid", description="Extraction method: hybrid, tfidf, rake, textrank")
    top_n: int = Field(default=10, ge=3, le=50, description="Number of keywords to return")
    weights: Optional[Dict[str, float]] = Field(default=None, description="Optional custom weights for hybrid method")

class KeywordItem(BaseModel):
    phrase: str
    score: float = Field(..., description="Normalized score between 0.0 and 1.0")
    raw_score: float = Field(default=0.0, description="Raw score from algorithm")
    frequency: int
    rank: int
    methods: Optional[List[str]] = Field(default_factory=list, description="Methods that extracted this phrase")

class ArticleStatistics(BaseModel):
    word_count: int
    unique_words: int
    sentence_count: int
    character_count: int
    avg_sentence_length: float

class ExtractionResponse(BaseModel):
    success: bool
    method: str
    statistics: ArticleStatistics
    keywords: List[KeywordItem]
    processing_time_ms: float
    message: Optional[str] = None

class UploadResponse(BaseModel):
    success: bool
    filename: str
    text: str
    word_count: int
    file_type: str
    message: Optional[str] = None

class ComparisonMethodResult(BaseModel):
    method: str
    method_name: str
    keywords: List[KeywordItem]

class ComparisonResponse(BaseModel):
    success: bool
    statistics: ArticleStatistics
    results: Dict[str, List[KeywordItem]]
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    version: str
    available_methods: List[str]
