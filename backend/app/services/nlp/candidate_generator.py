import re
from typing import List, Set, Dict, Tuple
from app.services.nlp.preprocessing import preprocessor, STOP_WORDS

class CandidateGenerator:
    """
    Generates high-quality candidate multi-word key phrases and keywords using:
    1. POS Tag pattern matching (ADJ+NOUN, NOUN+NOUN, ADJ+NOUN+NOUN, NOUN+NOUN+NOUN, etc.)
    2. RAKE-style Stopword Delimiter Splitting
    """
    
    # Valid POS tags for candidate terms: JJ (Adjective), NN/NNS/NNP/NNPS (Noun)
    VALID_POS_PREFIXES = ('JJ', 'NN')

    def __init__(self):
        self.stop_words = preprocessor.nltk_stopwords

    def extract_pos_candidates(self, text: str) -> List[str]:
        """
        Extract candidate key phrases based on POS tag sequences:
        - (ADJ)* (NOUN)+
        - e.g. "Artificial Intelligence", "Machine Learning", "Natural Language Processing", "Predictive Analytics"
        """
        sentences = preprocessor.tokenize_sentences(text)
        candidates = []

        for sentence in sentences:
            # Tokenize and tag words
            words = re.findall(r'\b[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*\b', sentence)
            if not words:
                continue

            tagged = preprocessor.pos_tag_tokens(words)

            current_phrase = []
            for word, tag in tagged:
                word_clean = word.strip()
                word_lower = word_clean.lower()

                # Check if token is a valid ADJ or NOUN and not a stopword/number-only
                is_valid_tag = any(tag.startswith(p) for p in self.VALID_POS_PREFIXES)
                is_valid_word = len(word_lower) >= 2 and word_lower not in self.stop_words and not word_lower.isdigit()

                if is_valid_tag and is_valid_word:
                    current_phrase.append(word_clean)
                else:
                    if current_phrase:
                        # Append phrase if it ends with a Noun
                        last_word_idx = len(current_phrase) - 1
                        phrase_str = " ".join(current_phrase)
                        if len(current_phrase) >= 1 and len(phrase_str) >= 3:
                            candidates.append(phrase_str)
                        current_phrase = []

            if current_phrase:
                phrase_str = " ".join(current_phrase)
                if len(phrase_str) >= 3:
                    candidates.append(phrase_str)

        return candidates

    def extract_rake_candidates(self, text: str) -> List[str]:
        """
        Extract candidate phrases by splitting text using stopwords and punctuation marks as phrase delimiters.
        """
        sentences = preprocessor.tokenize_sentences(text)
        candidates = []

        # Create regex pattern for stopwords and punctuation
        stop_pattern = r'\b(?:' + '|'.join(re.escape(w) for w in self.stop_words) + r')\b|[^\w\s-]'

        for sentence in sentences:
            # Split sentence into phrases using stopwords and punctuation as boundaries
            phrases = re.split(stop_pattern, sentence, flags=re.IGNORECASE)
            for phrase in phrases:
                cleaned_phrase = re.sub(r'^[^\w]+|[^\w]+$', '', phrase.strip())
                words = cleaned_phrase.split()
                # Keep phrases of 1 to 4 words
                if 1 <= len(words) <= 4:
                    filtered_words = [w for w in words if len(w) >= 2 and not w.isdigit()]
                    if filtered_words:
                        candidate = " ".join(filtered_words)
                        if len(candidate) >= 3:
                            candidates.append(candidate)

        return candidates

    def get_all_candidates(self, text: str) -> List[str]:
        """Combine POS tag candidates and RAKE candidates into a clean list of candidate phrases."""
        pos_phrases = self.extract_pos_candidates(text)
        rake_phrases = self.extract_rake_candidates(text)

        # Normalize and merge unique candidates
        unique_map: Dict[str, str] = {}
        for p in pos_phrases + rake_phrases:
            norm = p.lower()
            if norm not in unique_map or len(p) > len(unique_map[norm]):
                unique_map[norm] = p

        return list(unique_map.values())

candidate_generator = CandidateGenerator()
