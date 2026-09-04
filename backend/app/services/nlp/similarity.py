import re
from typing import List, Tuple, Dict
from app.models.schemas import KeywordItem

def normalize_phrase(phrase: str) -> str:
    """Normalize phrase string for comparison."""
    clean = re.sub(r'[^\w\s-]', '', phrase.lower())
    return " ".join(clean.split())

def jaccard_similarity(str1: str, str2: str) -> float:
    """Compute Jaccard similarity between word sets of two phrases."""
    set1 = set(normalize_phrase(str1).split())
    set2 = set(normalize_phrase(str2).split())
    if not set1 or not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / float(len(union))

def deduplicate_phrases(items: List[KeywordItem], similarity_threshold: float = 0.85) -> List[KeywordItem]:
    """
    Remove duplicates and near-duplicate phrases:
    - Case & punctuation exact duplicates.
    - Highly overlapping phrase candidates.
    - Retains the item with the higher relevance score or higher frequency.
    """
    if not items:
        return []

    # Sort descending by score then frequency
    sorted_items = sorted(items, key=lambda x: (x.score, x.frequency, len(x.phrase)), reverse=True)
    deduped: List[KeywordItem] = []

    for item in sorted_items:
        norm_item = normalize_phrase(item.phrase)
        if not norm_item or len(norm_item) < 2:
            continue

        is_duplicate = False
        for existing in deduped:
            norm_existing = normalize_phrase(existing.phrase)

            # 1. Exact normalized match
            if norm_item == norm_existing:
                is_duplicate = True
                # Merge methods if present
                for m in (item.methods or []):
                    if m not in (existing.methods or []):
                        existing.methods.append(m)
                break

            # 2. Substring containment if words are almost identical
            item_words = norm_item.split()
            existing_words = norm_existing.split()

            # If one phrase is a strict subset of another phrase (e.g., "machine" inside "machine learning")
            if len(item_words) == 1 and len(existing_words) > 1 and item_words[0] in existing_words:
                # If the longer phrase exists with high score, suppress the unigram duplicate
                if existing.score >= item.score * 0.8:
                    is_duplicate = True
                    break

            # 3. High Jaccard token overlap
            sim = jaccard_similarity(item.phrase, existing.phrase)
            if sim >= similarity_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            deduped.append(item)

    # Re-assign ranks
    for idx, item in enumerate(deduped, start=1):
        item.rank = idx

    return deduped
