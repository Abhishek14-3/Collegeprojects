import re
import networkx as nx
from typing import List, Tuple, Dict
from app.services.nlp.preprocessing import preprocessor
from app.services.nlp.candidate_generator import candidate_generator

class TextRankExtractor:
    def __init__(self, window_size: int = 4, damping_factor: float = 0.85):
        self.window_size = window_size
        self.damping_factor = damping_factor
        self.stop_words = preprocessor.nltk_stopwords

    def extract(self, text: str, candidates: List[str] = None) -> List[Tuple[str, float, int]]:
        """
        Extract key phrases using TextRank graph algorithm.
        Returns list of tuples: (phrase, normalized_score, frequency)
        """
        if not text.strip():
            return []

        if not candidates:
            candidates = candidate_generator.get_all_candidates(text)

        tokens = preprocessor.tokenize_words(text)
        # Filter tokens for building word graph: length >= 2, not stopword, not digit
        clean_tokens = [t for t in tokens if t not in self.stop_words and len(t) >= 2 and not t.isdigit()]

        if not clean_tokens:
            return []

        # 1. Build co-occurrence graph
        graph = nx.Graph()
        for i in range(len(clean_tokens)):
            for j in range(i + 1, min(i + self.window_size, len(clean_tokens))):
                node_a = clean_tokens[i]
                node_b = clean_tokens[j]
                if node_a != node_b:
                    if graph.has_edge(node_a, node_b):
                        graph[node_a][node_b]['weight'] += 1.0
                    else:
                        graph.add_edge(node_a, node_b, weight=1.0)

        if graph.number_of_nodes() == 0:
            return []

        # 2. Run PageRank algorithm
        try:
            ranks = nx.pagerank(graph, alpha=self.damping_factor, max_iter=100)
        except Exception:
            # Fallback uniform ranks if pagerank fails to converge
            num_nodes = graph.number_of_nodes()
            ranks = {node: 1.0 / num_nodes for node in graph.nodes()}

        # 3. Score candidate phrases based on PageRank of constituent words
        phrase_scores: Dict[str, Tuple[float, int]] = {}
        text_lower = text.lower()

        for candidate in candidates:
            cand_words = re.findall(r'\b[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*\b', candidate.lower())
            cand_words = [w for w in cand_words if w not in self.stop_words]
            if not cand_words:
                continue

            # Phrase score is sum of constituent word ranks
            score = sum(ranks.get(w, 0.0) for w in cand_words)
            if score > 0:
                pattern = r'\b' + re.escape(candidate.lower()) + r'\b'
                freq = len(re.findall(pattern, text_lower))
                if freq == 0:
                    freq = 1
                
                # Multi-word multiplier
                length_boost = 1.0 + 0.2 * (len(cand_words) - 1)
                final_raw_score = score * length_boost
                
                if candidate not in phrase_scores or final_raw_score > phrase_scores[candidate][0]:
                    phrase_scores[candidate] = (final_raw_score, freq)

        if not phrase_scores:
            return []

        # 4. Normalize scores to [0, 1]
        max_score = max(s for s, _ in phrase_scores.values())
        if max_score == 0:
            max_score = 1.0

        results = [
            (phrase, round(score / max_score, 4), freq)
            for phrase, (score, freq) in phrase_scores.items()
        ]

        # Sort descending by score
        results.sort(key=lambda x: x[1], reverse=True)
        return results

textrank_extractor = TextRankExtractor()
