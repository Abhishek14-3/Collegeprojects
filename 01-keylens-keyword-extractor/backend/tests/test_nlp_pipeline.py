import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app.services.nlp.preprocessing import preprocessor
from app.services.nlp.candidate_generator import candidate_generator
from app.services.nlp.tfidf_extractor import tfidf_extractor
from app.services.nlp.rake_extractor import rake_extractor
from app.services.nlp.textrank_extractor import textrank_extractor
from app.services.nlp.hybrid_extractor import hybrid_extractor
from app.services.nlp.similarity import deduplicate_phrases, jaccard_similarity
from app.models.schemas import KeywordItem

SAMPLE_TEXT = """
Artificial intelligence is transforming healthcare through machine learning and predictive analytics.
Deep learning algorithms enable automatic medical image analysis and early disease diagnosis.
Natural language processing techniques allow doctors to extract critical clinical insights from medical records.
Machine learning models continue to improve diagnostic accuracy and patient outcomes across hospitals.
"""

def test_preprocessing():
    sentences = preprocessor.tokenize_sentences(SAMPLE_TEXT)
    assert len(sentences) >= 3
    words = preprocessor.tokenize_words("Artificial Intelligence in Healthcare!")
    assert "artificial" in words
    assert "healthcare" in words

def test_candidate_generation():
    candidates = candidate_generator.get_all_candidates(SAMPLE_TEXT)
    assert len(candidates) > 0
    cand_lower = [c.lower() for c in candidates]
    assert any("machine learning" in c for c in cand_lower) or any("artificial intelligence" in c for c in cand_lower)

def test_tfidf_extraction():
    results = tfidf_extractor.extract(SAMPLE_TEXT)
    assert len(results) > 0
    phrase, score, freq = results[0]
    assert 0.0 <= score <= 1.0
    assert freq >= 1

def test_rake_extraction():
    results = rake_extractor.extract(SAMPLE_TEXT)
    assert len(results) > 0
    phrase, score, freq = results[0]
    assert 0.0 <= score <= 1.0

def test_textrank_extraction():
    results = textrank_extractor.extract(SAMPLE_TEXT)
    assert len(results) > 0
    phrase, score, freq = results[0]
    assert 0.0 <= score <= 1.0

def test_hybrid_extraction():
    keywords = hybrid_extractor.extract(SAMPLE_TEXT, top_n=5)
    assert len(keywords) > 0
    assert len(keywords) <= 5
    assert keywords[0].score >= keywords[-1].score

def test_deduplication():
    items = [
        KeywordItem(phrase="Machine Learning", score=0.95, raw_score=0.95, frequency=5, rank=1, methods=["tfidf"]),
        KeywordItem(phrase="machine learning", score=0.90, raw_score=0.90, frequency=5, rank=2, methods=["rake"]),
        KeywordItem(phrase="Artificial Intelligence", score=0.88, raw_score=0.88, frequency=3, rank=3, methods=["textrank"]),
    ]
    deduped = deduplicate_phrases(items)
    assert len(deduped) == 2
    assert deduped[0].phrase == "Machine Learning"
    assert "rake" in deduped[0].methods
