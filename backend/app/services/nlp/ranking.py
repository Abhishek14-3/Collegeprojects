import time
from typing import List, Dict, Optional
from app.models.schemas import KeywordItem, ExtractionResponse, ArticleStatistics
from app.services.nlp.tfidf_extractor import tfidf_extractor
from app.services.nlp.rake_extractor import rake_extractor
from app.services.nlp.textrank_extractor import textrank_extractor
from app.services.nlp.hybrid_extractor import hybrid_extractor
from app.services.nlp.similarity import deduplicate_phrases
from app.utils.text_utils import compute_statistics

def run_extraction_pipeline(
    text: str,
    method: str = "hybrid",
    top_n: int = 10,
    weights: Optional[Dict[str, float]] = None
) -> ExtractionResponse:
    """Execute complete NLP extraction pipeline for requested method."""
    start_time = time.time()
    method_clean = method.lower().strip()

    stats_dict = compute_statistics(text)
    statistics = ArticleStatistics(**stats_dict)

    items: List[KeywordItem] = []

    if method_clean == "hybrid":
        items = hybrid_extractor.extract(text, weights=weights, top_n=top_n * 2)

    elif method_clean == "tfidf":
        raw_results = tfidf_extractor.extract(text)
        for phrase, score, freq in raw_results:
            items.append(KeywordItem(
                phrase=phrase,
                score=score,
                raw_score=score,
                frequency=freq,
                rank=0,
                methods=["tfidf"]
            ))
        items = deduplicate_phrases(items)

    elif method_clean == "rake":
        raw_results = rake_extractor.extract(text)
        for phrase, score, freq in raw_results:
            items.append(KeywordItem(
                phrase=phrase,
                score=score,
                raw_score=score,
                frequency=freq,
                rank=0,
                methods=["rake"]
            ))
        items = deduplicate_phrases(items)

    elif method_clean == "textrank":
        raw_results = textrank_extractor.extract(text)
        for phrase, score, freq in raw_results:
            items.append(KeywordItem(
                phrase=phrase,
                score=score,
                raw_score=score,
                frequency=freq,
                rank=0,
                methods=["textrank"]
            ))
        items = deduplicate_phrases(items)

    else:
        # Default fallback to hybrid
        items = hybrid_extractor.extract(text, weights=weights, top_n=top_n * 2)

    # Trim to top_n and assign final ranks
    final_keywords = items[:top_n]
    for idx, item in enumerate(final_keywords, start=1):
        item.rank = idx

    processing_time_ms = round((time.time() - start_time) * 1000, 2)

    return ExtractionResponse(
        success=True,
        method=method_clean,
        statistics=statistics,
        keywords=final_keywords,
        processing_time_ms=processing_time_ms
    )
