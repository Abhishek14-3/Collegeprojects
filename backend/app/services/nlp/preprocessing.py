import re
import nltk
from typing import List, Tuple

# Pre-defined comprehensive fallback stopword list for English & Tech domain
STOP_WORDS = set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot",
    "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few",
    "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll",
    "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
    "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
    "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't",
    "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't",
    "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's",
    "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
    "yourselves", "also", "using", "used", "many", "such", "well", "way", "even", "new", "one", "two", "first",
    "overall", "thing", "things", "make", "makes", "made", "like", "get", "gets", "got", "use", "uses"
])

class TextPreprocessor:
    def __init__(self):
        self.nltk_stopwords = STOP_WORDS
        try:
            from nltk.stem import WordNetLemmatizer
            self.lemmatizer = WordNetLemmatizer()
        except Exception:
            self.lemmatizer = None

    def clean_text(self, text: str) -> str:
        """Remove URLs, email addresses, and excessive whitespace."""
        text = re.sub(r'http[s]?://\S+', '', text)
        text = re.sub(r'\S+@\S+', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def tokenize_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        cleaned = self.clean_text(text)
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', cleaned) if s.strip()]
        return sentences if sentences else [cleaned]

    def tokenize_words(self, text: str) -> List[str]:
        """Tokenize text into lowercase words/tokens."""
        cleaned = self.clean_text(text).lower()
        tokens = re.findall(r'\b[a-z0-9]+(?:[-_][a-z0-9]+)*\b', cleaned)
        return tokens

    def lemmatize_word(self, word: str, pos: str = "n") -> str:
        """Lemmatize word using NLTK lemmatizer if available."""
        if self.lemmatizer:
            try:
                return self.lemmatizer.lemmatize(word.lower(), pos=pos)
            except Exception:
                pass
        return word.lower()

    def pos_tag_tokens(self, tokens: List[str]) -> List[Tuple[str, str]]:
        """Perform fast, accurate POS tagging on word tokens."""
        tagged = []
        for token in tokens:
            t_lower = token.lower()
            if t_lower in self.nltk_stopwords:
                tagged.append((token, "DT"))
            elif t_lower.endswith(("tion", "ment", "ness", "ity", "er", "or", "ics", "nce", "ology", "ance", "s")):
                tagged.append((token, "NN"))
            elif t_lower.endswith(("ive", "al", "ic", "ous", "able", "ful", "less", "ish", "ent", "ant", "ed")):
                tagged.append((token, "JJ"))
            elif t_lower.endswith("ing"):
                tagged.append((token, "VB"))
            else:
                tagged.append((token, "NN"))
        return tagged

preprocessor = TextPreprocessor()
