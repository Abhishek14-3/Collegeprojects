import re
import numpy as np
from typing import List, Tuple, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from app.services.nlp.preprocessing import preprocessor
from app.services.nlp.candidate_generator import candidate_generator

class TFIDFExtractor:
    def __init__(self):
        self.stop_words = list(preprocessor.nltk_stopwords)

    def extract(self, text: str, candidates: List[str] = None) -> List[Tuple[str, float, int]]:
        """
        Extract terms and key phrases using TF-IDF.
        Returns list of tuples: (phrase, normalized_score, frequency)
        """
        if not candidates:
            candidates = candidate_generator.get_all_candidates(text)

        if not candidates or not text.strip():
            return []

        # Prepare corpus consisting of sentences in the article
        sentences = preprocessor.tokenize_sentences(text)
        if not sentences:
            sentences = [text]

        # Normalize candidate phrases for matching
        candidate_map = {c.lower(): c for c in candidates}
        vocabulary = list(candidate_map.keys())

        if not vocabulary:
            return []

        try:
            vectorizer = TfidfVectorizer(
                vocabulary=vocabulary,
                ngram_range=(1, 3),
                lowercase=True,
                stop_words=self.stop_words,
                token_pattern=r'(?u)\b[\w-]+\b'
            )
            tfidf_matrix = vectorizer.fit_transform(sentences)
            feature_names = vectorizer.get_feature_names_out()

            # Sum TF-IDF scores across sentences
            scores = np.asarray(tfidf_matrix.sum(axis=0)).flatten()

            phrase_scores: List[Tuple[str, float, int]] = []
            text_lower = text.lower()

            max_score = float(np.max(scores)) if len(scores) > 0 and np.max(scores) > 0 else 1.0

            for idx, feature in enumerate(feature_names):
                raw_score = float(scores[idx])
                if raw_score > 0:
                    original_phrase = candidate_map.get(feature, feature.title())
                    
                    # Count exact occurrences in original text
                    pattern = r'\b' + re.escape(feature) + r'\b'
                    frequency = len(re.findall(pattern, text_lower))
                    if frequency == 0:
                        frequency = 1

                    # Boost score for multi-word phrases slightly
                    word_count = len(original_phrase.split())
                    boosted_score = raw_score * (1.0 + 0.15 * (word_count - 1))
                    
                    phrase_scores.append((original_phrase, boosted_score, frequency))

            # Normalize scores to [0, 1]
            if phrase_scores:
                max_boosted = max(s for _, s, _ in phrase_scores)
                normalized = [
                    (phrase, round(score / max_boosted, 4), freq)
                    for phrase, score, freq in phrase_scores
                ]
                # Sort descending by score
                normalized.sort(key=lambda x: x[1], reverse=True)
                return normalized

        except Exception as e:
            pass

        return []

tfidf_extractor = TFIDFExtractor()
