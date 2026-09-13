import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_ARTICLE = """
Natural language processing (NLP) is a subfield of computer science, information engineering, and artificial intelligence
concerned with the interactions between computers and human languages. It focuses on how to program computers to process and analyze
large amounts of natural language data. Deep learning techniques achieve state-of-the-art results in language translation and sentiment analysis.
"""

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "hybrid" in data["available_methods"]

def test_extract_endpoint():
    payload = {
        "text": SAMPLE_ARTICLE,
        "method": "hybrid",
        "top_n": 5
    }
    response = client.post("/api/extract", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["statistics"]["word_count"] > 20
    assert len(data["keywords"]) > 0

def test_extract_invalid_input():
    payload = {"text": "too short", "method": "tfidf"}
    response = client.post("/api/extract", json=payload)
    assert response.status_code in [400, 422]

def test_compare_endpoint():
    payload = {
        "text": SAMPLE_ARTICLE,
        "method": "hybrid",
        "top_n": 5
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "hybrid" in data["results"]
    assert "tfidf" in data["results"]
    assert "rake" in data["results"]
    assert "textrank" in data["results"]
