import time
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from typing import Optional, Dict
from app.models.schemas import (
    ExtractionRequest, ExtractionResponse, UploadResponse, 
    ComparisonResponse, HealthResponse, ArticleStatistics
)
from app.services.nlp.ranking import run_extraction_pipeline
from app.utils.file_parser import extract_text_from_file
from app.utils.text_utils import compute_statistics
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Return API health status and available NLP algorithms."""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        available_methods=["hybrid", "tfidf", "rake", "textrank"]
    )

@router.post("/extract", response_model=ExtractionResponse)
def extract_keywords(payload: ExtractionRequest):
    """Extract keywords and key phrases from input text using selected NLP method."""
    if not payload.text or len(payload.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Article text must contain at least 10 characters.")

    try:
        response = run_extraction_pipeline(
            text=payload.text,
            method=payload.method,
            top_n=payload.top_n,
            weights=payload.weights
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLP Extraction Error: {str(e)}")

@router.post("/upload", response_model=UploadResponse)
def upload_file(file: UploadFile = File(...)):
    """Upload TXT, PDF, or DOCX document and extract text for analysis."""
    text, file_type = extract_text_from_file(file)
    stats = compute_statistics(text)

    return UploadResponse(
        success=True,
        filename=file.filename or "uploaded_document",
        text=text,
        word_count=stats["word_count"],
        file_type=file_type,
        message=f"Successfully extracted {stats['word_count']} words from {file_type} document."
    )

@router.post("/compare", response_model=ComparisonResponse)
def compare_methods(payload: ExtractionRequest):
    """Run all 4 extraction methods (TF-IDF, RAKE, TextRank, Hybrid) simultaneously for comparison."""
    if not payload.text or len(payload.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Article text must contain at least 10 characters.")

    start_time = time.time()
    top_n = payload.top_n

    methods = ["hybrid", "tfidf", "rake", "textrank"]
    results_map = {}

    for method in methods:
        resp = run_extraction_pipeline(
            text=payload.text,
            method=method,
            top_n=top_n,
            weights=payload.weights
        )
        results_map[method] = resp.keywords

    stats_dict = compute_statistics(payload.text)
    statistics = ArticleStatistics(**stats_dict)
    processing_time_ms = round((time.time() - start_time) * 1000, 2)

    return ComparisonResponse(
        success=True,
        statistics=statistics,
        results=results_map,
        processing_time_ms=processing_time_ms
    )
