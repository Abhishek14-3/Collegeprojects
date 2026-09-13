# 🔍 KeyLens — NLP Keyword & Key-Phrase Extractor

> **Project 01** | Full-Stack NLP Web Application  
> An end-to-end, production-quality keyword extraction tool that surfaces meaningful multi-word key-phrases from unstructured text documents using four distinct NLP algorithms.

---

## ✨ Features

- **4 Extraction Algorithms**: TF-IDF (statistical), RAKE (co-occurrence), TextRank (graph/PageRank), and a custom Hybrid scoring model
- **Multi-Word Phrase Support**: Extracts 1–4 word technical key-phrases, not just isolated single words
- **Algorithm Comparison View**: Side-by-side benchmark of all four algorithms with a Recharts bar graph
- **Interactive Phrase Cloud**: Score-scaled visual word cloud
- **Document Upload**: Drag-and-drop support for `.txt`, `.pdf`, and `.docx` files
- **Export**: One-click CSV and JSON export of ranked keyword lists
- **Real-Time Stats**: Word count, sentence count, character count, and processing time in ms

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13 · FastAPI · Uvicorn · Pydantic v2 |
| NLP | Scikit-Learn (TF-IDF) · NetworkX (TextRank/PageRank) · NLTK · NumPy |
| Document Parsing | PyPDF2 · python-docx |
| Frontend | React 18 · TypeScript 5 · Vite 5 |
| Styling | Tailwind CSS v3 · Framer Motion · Recharts |
| Testing | Pytest · HTTPX · Starlette TestClient |

---

## 📁 Project Structure

```
01-keylens-keyword-extractor/
│
├── backend/                        # FastAPI backend service
│   ├── app/
│   │   ├── api/routes.py           # REST endpoints (/extract, /compare, /upload, /health)
│   │   ├── core/config.py          # Environment config
│   │   ├── models/schemas.py       # Pydantic request/response schemas
│   │   ├── services/nlp/           # Core NLP algorithm modules
│   │   │   ├── preprocessing.py
│   │   │   ├── candidate_generator.py
│   │   │   ├── tfidf_extractor.py
│   │   │   ├── rake_extractor.py
│   │   │   ├── textrank_extractor.py
│   │   │   ├── hybrid_extractor.py
│   │   │   ├── ranking.py
│   │   │   └── similarity.py
│   │   └── utils/                  # File parser & text utilities
│   ├── tests/                      # Pytest test suite
│   ├── requirements.txt
│   └── run.py                      # Uvicorn launcher
│
├── frontend/                       # React + TypeScript SPA
│   ├── src/
│   │   ├── components/             # UI components
│   │   ├── services/api.ts         # Fetch wrapper for FastAPI
│   │   ├── types/index.ts          # TypeScript interfaces
│   │   └── App.tsx                 # Root component
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── sample_data/                    # Sample .txt articles for testing
├── docs/
│   └── FULL_PROJECT_DOCUMENTATION.txt  # Complete project documentation
└── README.md                       # ← You are here
```

---

## ⚡ How to Run

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 1. Start the Backend

```bash
cd 01-keylens-keyword-extractor/backend
# (Optional) Activate a virtual environment
python run.py
# Backend runs at: http://127.0.0.1:8000
# Swagger API docs at: http://127.0.0.1:8000/docs
```

### 2. Start the Frontend

```bash
cd 01-keylens-keyword-extractor/frontend
npm install     # Only needed the first time
npm run dev
# Frontend runs at: http://localhost:5173
```

### 3. Run Backend Tests

```bash
cd 01-keylens-keyword-extractor/backend
pytest tests/
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check & available algorithms |
| `POST` | `/api/extract` | Extract keywords with one algorithm |
| `POST` | `/api/compare` | Run all 4 algorithms simultaneously |
| `POST` | `/api/upload` | Upload `.txt`/`.pdf`/`.docx` and extract text |

---

## 📖 Full Documentation

See [`docs/FULL_PROJECT_DOCUMENTATION.txt`](./docs/FULL_PROJECT_DOCUMENTATION.txt) for complete NLP methodology, algorithmic architecture, and system data-flow documentation.
