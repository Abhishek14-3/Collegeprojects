import re
from typing import List, Dict, Tuple, Optional
from app.services.nlp.tfidf_extractor import tfidf_extractor
from app.services.nlp.rake_extractor import rake_extractor
from app.services.nlp.textrank_extractor import textrank_extractor
from app.services.nlp.candidate_generator import candidate_generator
from app.services.nlp.similarity import deduplicate_phrases, normalize_phrase
from app.models.schemas import KeywordItem
from app.core.config import settings

class HybridExtractor:
    def __init__(self):
        self.default_w_tfidf = settings.DEFAULT_WEIGHT_TFIDF
        self.default_w_rake = settings.DEFAULT_WEIGHT_RAKE
        self.default_w_textrank = settings.DEFAULT_WEIGHT_TEXTRANK

    def extract(
        self, 
        text: str, 
        weights: Optional[Dict[str, float]] = None, 
        top_n: int = 10
    ) -> List[KeywordItem]:
        """
        Extract keywords and keyphrases by combining TF-IDF, RAKE, and TextRank algorithms.
        """
        if not text.strip():
            return []

        w_tfidf = weights.get("tfidf", self.default_w_tfidf) if weights else self.default_w_tfidf
        w_rake = weights.get("rake", self.default_w_rake) if weights else self.default_w_rake
        w_textrank = weights.get("textrank", self.default_w_textrank) if weights else self.default_w_textrank

        # Ensure weights sum to 1.0
        total_w = w_tfidf + w_rake + w_textrank
        if total_w > 0:
            w_tfidf /= total_w
            w_rake /= total_w
            w_textrank /= total_w
        else:
            w_tfidf, w_rake, w_textrank = 0.35, 0.30, 0.35

        candidates = candidate_generator.get_all_candidates(text)
        if not candidates:
            return []

        # Run constituent extractors
        tfidf_results = tfidf_extractor.extract(text, candidates)
        rake_results = rake_extractor.extract(text, candidates)
        textrank_results = textrank_extractor.extract(text, candidates)

        phrase_map: Dict[str, Dict] = {}

        # Process TF-IDF results
        for phrase, score, freq in tfidf_results:
            norm = normalize_phrase(phrase)
            if norm not in phrase_map:
                phrase_map[norm] = {
                    "original_phrase": phrase,
                    "tfidf": score,
                    "rake": 0.0,
                    "textrank": 0.0,
                    "frequency": freq,
                    "methods": ["tfidf"]
                }
            else:
                phrase_map[norm]["tfidf"] = score
                if "tfidf" not in phrase_map[norm]["methods"]:
                    phrase_map[norm]["methods"].append("tfidf")

        # Process RAKE results
        for phrase, score, freq in rake_results:
            norm = normalize_phrase(phrase)
            if norm not in phrase_map:
                phrase_map[norm] = {
                    "original_phrase": phrase,
                    "tfidf": 0.0,
                    "rake": score,
                    "textrank": 0.0,
                    "frequency": freq,
                    "methods": ["rake"]
                }
            else:
                phrase_map[norm]["rake"] = score
                phrase_map[norm]["frequency"] = max(phrase_map[norm]["frequency"], freq)
                if "rake" not in phrase_map[norm]["methods"]:
                    phrase_map[norm]["methods"].append("rake")

        # Process TextRank results
        for phrase, score, freq in textrank_results:
            norm = normalize_phrase(phrase)
            if norm not in phrase_map:
                phrase_map[norm] = {
                    "original_phrase": phrase,
                    "tfidf": 0.0,
                    "rake": 0.0,
                    "textrank": score,
                    "frequency": freq,
                    "methods": ["textrank"]
                }
            else:
                phrase_map[norm]["textrank"] = score
                phrase_map[norm]["frequency"] = max(phrase_map[norm]["frequency"], freq)
                if "textrank" not in phrase_map[norm]["methods"]:
                    phrase_map[norm]["methods"].append("textrank")

        items: List[KeywordItem] = []
        for norm, data in phrase_map.items():
            # Calculate weighted hybrid score
            hybrid_score = (
                w_tfidf * data["tfidf"] + 
                w_rake * data["rake"] + 
                w_textrank * data["textrank"]
            )
            
            # Boost score slightly if multiple algorithms independently extracted it!
            method_count = len(data["methods"])
            consensus_boost = 1.0 + 0.1 * (method_count - 1)
            final_raw_score = hybrid_score * consensus_boost

            items.append(KeywordItem(
                phrase=data["original_phrase"],
                score=round(min(1.0, final_raw_score), 4),
                raw_score=round(final_raw_score, 4),
                frequency=data["frequency"],
                rank=0,
                methods=data["methods"]
            ))

        # Perform semantic deduplication
        deduped = deduplicate_phrases(items)

        # Normalize top score to 1.0 if items exist
        if deduped:
            max_s = max(item.score for item in deduped)
            if max_s > 0:
                for item in deduped:
                    item.score = round(min(1.0, item.score / max_s), 4)

        # Return requested top_n items
        return deduped[:top_n]

hybrid_extractor = HybridExtractor()
