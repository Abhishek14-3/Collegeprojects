import re
import time
from typing import Dict, Any, Tuple

def compute_statistics(text: str) -> Dict[str, Any]:
    """Calculate text statistics including word count, unique words, sentence count, and char count."""
    clean_text = text.strip()
    if not clean_text:
        return {
            "word_count": 0,
            "unique_words": 0,
            "sentence_count": 0,
            "character_count": 0,
            "avg_sentence_length": 0.0
        }

    # Sentences: split on period, exclamation, question mark
    sentences = [s.strip() for s in re.split(r'[.!?]+', clean_text) if s.strip()]
    sentence_count = max(1, len(sentences))

    # Words: alphanumeric tokens
    words = re.findall(r'\b[a-zA-Z0-9_-]+\b', clean_text.lower())
    word_count = len(words)
    unique_words = len(set(words))
    character_count = len(clean_text)

    avg_sentence_length = round(word_count / sentence_count, 1) if sentence_count > 0 else 0.0

    return {
        "word_count": word_count,
        "unique_words": unique_words,
        "sentence_count": sentence_count,
        "character_count": character_count,
        "avg_sentence_length": avg_sentence_length
    }
