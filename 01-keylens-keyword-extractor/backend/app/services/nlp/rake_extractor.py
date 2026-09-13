import re
from typing import List, Tuple, Dict
from collections import defaultdict
from app.services.nlp.preprocessing import preprocessor
from app.services.nlp.candidate_generator import candidate_generator

class RAKEExtractor:
    def __init__(self):
        self.stop_words = preprocessor.nltk_stopwords

    def extract(self, text: str, candidates: List[str] = None) -> List[Tuple[str, float, int]]:
        """
        Extract key phrases using RAKE algorithm.
        Returns list of tuples: (phrase, normalized_score, frequency)
        """
        if not candidates:
            candidates = candidate_generator.extract_rake_candidates(text)

        if not candidates or not text.strip():
            return []

        # 1. Build word degree and frequency tables
        word_frequency = defaultdict(int)
        word_degree = defaultdict(int)

        phrase_list = []
        for candidate in candidates:
            words = re.findall(r'\b[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*\b', candidate.lower())
            words = [w for w in words if w not in self.stop_words and len(w) >= 2]
            if not words:
                continue

            phrase_list.append((candidate, words))
            phrase_length = len(words)
            phrase_degree = phrase_length - 1  # co-occurrences

            for word in words:
                word_frequency[word] += 1
                word_degree[word] += phrase_degree + 1

        if not word_frequency:
            return []

        # 2. Calculate word scores: degree(w) / frequency(w)
        word_score = {}
        for word in word_frequency:
            word_score[word] = word_degree[word] / float(word_frequency[word])

        # 3. Calculate candidate phrase scores
        # Use phrase_norm (lowercase) as the canonical key to avoid case-mismatch KeyErrors
        raw_phrase_scores: Dict[str, Tuple[float, int]] = {}
        # Track the best display form for each normalized key
        phrase_display: Dict[str, str] = {}
        text_lower = text.lower()

        for original_phrase, words in phrase_list:
            phrase_norm = original_phrase.lower()
            score = sum(word_score[w] for w in words if w in word_score)

            if phrase_norm not in raw_phrase_scores:
                pattern = r'\b' + re.escape(phrase_norm) + r'\b'
                freq = len(re.findall(pattern, text_lower))
                if freq == 0:
                    freq = 1
                raw_phrase_scores[phrase_norm] = (score, freq)
                phrase_display[phrase_norm] = original_phrase
            else:
                curr_score, curr_freq = raw_phrase_scores[phrase_norm]
                raw_phrase_scores[phrase_norm] = (max(curr_score, score), curr_freq)

        if not raw_phrase_scores:
            return []

        # 4. Normalize scores to [0, 1]
        max_raw = max(s for s, _ in raw_phrase_scores.values())
        if max_raw == 0:
            max_raw = 1.0

        results = [
            (phrase_display.get(phrase_norm, phrase_norm), round(score / max_raw, 4), freq)
            for phrase_norm, (score, freq) in raw_phrase_scores.items()
        ]

        # Sort descending by score
        results.sort(key=lambda x: x[1], reverse=True)
        return results

rake_extractor = RAKEExtractor()
