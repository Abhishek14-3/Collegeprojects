# 🌍 Wander Wallet — Smart Group Travel Budget & Expense Companion

> **Project 02** | Full-Stack Travel Planning & Financial Architecture  
> An autonomous, deterministic group travel planning and expense management platform with zero-drift minor-unit math, greedy debt simplification, AI Group CFO, and interactive Leaflet maps.

---

## 🚀 Overview

Group travel is notorious for financial friction: awkward debt settlements, lost pennies from rounding errors, unverified prices, and chaotic restaurant bills. 

**Wander Wallet** resolves the entire lifecycle of group vacations into a single, cohesive, editorial workspace:
1. **Collaborative Discovery & Itinerary**: Explore verified attractions, accommodations, and transit hubs via OpenStreetMap and Leaflet without needing paid API keys.
2. **Deterministic Minor-Unit Arithmetic**: All budget and expense computations operate strictly in integer minor units (paise/cents) with native `BigInt` guarantees, completely eliminating floating-point rounding drift.
3. **Smart Expense Splitting & Debt Minimization**: Supports 4 split methodologies (Equal, Exact, Percentage, Custom/Subset) and applies a greedy graph algorithm to resolve circular debts into the minimum possible cash transactions.
4. **AI Group CFO & Safety Alarms**: Monitors group burn velocity, single-payer concentration risk, category spending caps, and provides proactive kitty top-up suggestions.
5. **Live UPI QR & Receipt OCR**: Instant UPI payment QR code generation with custom VPA deep links, plus itemized receipt parsing that calculates proportional GST for vegetarians vs. non-vegetarians and drinkers vs. non-drinkers.

---

## ✨ Key Features

- **🗺️ Interactive Map & POI Discovery (100% Free)**
  - Powered by Leaflet.js, OpenStreetMap, and CartoDB Voyager tiles.
  - Zero proprietary API keys required — works completely free out-of-the-box.
  - Nominatim geocoding and Overpass POI queries for authentic local landmarks.

- **💰 Deterministic Minor-Unit Accounting (Zero-Drift)**
  - All currency calculations use integer minor units (paise/cents) to avoid IEEE 754 floating-point inaccuracies.
  - When ₹100 is split among 3 travelers, shares are allocated as 3,334 + 3,333 + 3,333 = exactly 10,000 paise.

- **⚡ Minimum-Cash-Flow Debt Simplification**
  - Greedy graph reduction resolves multi-party debts into the fewest direct transactions.
  - Eliminates circular transfers (e.g., if A owes B ₹1,000 and B owes C ₹1,000, A pays C directly).

- **📲 Live Indian UPI QR Codes & Deep Links**
  - Real-time generation of standard NPCI UPI links and scannable QR codes for Google Pay, PhonePe, Paytm, and BHIM.
  - Allows editing recipient VPA with live QR recalculation.

- **🧾 4 Flexible Expense Split Strategies**
  - **Equal Split**: Even distribution with automated minor-unit remainder absorption.
  - **Exact Split**: Individual minor-unit inputs strictly validated to equal total spend.
  - **Percentage Split**: Precise proportional splits validated to sum to 100.0%.
  - **Subset & Personal Splitting**: Tag specific participants (e.g. only 2 people on a cab ride) or tag personal shopping to completely exclude non-participating travelers from shared debt.

- **🤖 AI Group CFO & Burn Velocity Engine**
  - Evaluates real-time Trip Health Score (0–100) and risk grades (`EXCELLENT`, `HEALTHY`, `WATCHLIST`, `AT_RISK`).
  - Flags pacing burn velocity and single-payer concentration risk when one traveler finances >60% of group costs.
  - Delivers proactive, actionable financial recommendations to protect group harmony.

- **🔍 Itemized Receipt OCR & Proportional GST Splitting**
  - Accurately distributes statutory GST and service charges proportionally across claimed dishes.
  - Ensures non-drinkers and vegetarians are never burdened by alcohol or premium non-veg taxes.

- **💬 Conversational NLP Expense Assistant**
  - Natural language parsing for hands-free expense entry (e.g., *"Alex paid ₹4,000 for seafood dinner split with Rahul and Priya"*).

- **🚨 Category Spending Caps & Breach Alerts**
  - Pre-allocated budget caps: Lodging (31%), Transit (20%), Dining (18%), Activities (14%), Local Transport (9%), Safety Buffer (8%).
  - Real-time warning triggers at 80% and breach alarms at >100% capacity.

- **💱 Multi-Currency FX Conversion**
  - Integrated with the Frankfurter Open Exchange API (European Central Bank data) with in-memory TTL caching for instant foreign trip conversions.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16.3.6 (App Router + Turbopack) | Server-side rendering, API route handlers, and performant client routing |
| **Frontend UI** | React 19 • TypeScript 5 | Concurrent UI components, typed data contracts, and modern hooks |
| **Styling** | Tailwind CSS 4 • Lucide Icons | Editorial travel journal aesthetic (Cream, Forest Green, Terracotta Clay) |
| **Maps & Geospatial** | Leaflet.js • OpenStreetMap • Nominatim | Free, keyless interactive maps and location geocoding |
| **Financial Engine** | Deterministic Minor-Unit Core (Paise/Cents) | Native `BigInt` and integer math guaranteeing zero rounding drift |
| **Payments** | QRCode Canvas Engine • UPI Deep Links | Dynamic UPI QR generation for Indian mobile payment apps |
| **Database & ORM** | Prisma ORM 6.19 • In-Memory Fallback Store | Type-safe PostgreSQL data model with resilient in-memory fallback |
| **Currency Data** | Frankfurter Open Exchange Rates API | Live, cached ECB foreign exchange rate conversions |
| **Security & Auth** | Jose (JWT) • BcryptJS | Secure session handling and password hashing |
| **Validation** | Zod 4 | Strict runtime schema validation for requests and financial inputs |
| **Testing** | TSX • Node Test Runner | 24 end-to-end automated test suites with 100% pass rate |

---

## 📁 Project Structure

```
02-wander-wallet-travel-planner/
├── prisma/
│   ├── schema.prisma              # 25 production models (Trip, Member, Expense, Itinerary, etc.)
│   └── seed.ts                    # Sample trip seed data
├── public/                        # Static assets, SVG icons, and web manifest
├── src/
│   ├── app/                       # Next.js 16 App Router
│   │   ├── api/                   # REST API route handlers
│   │   │   ├── auth/              # Login, register, logout, session
│   │   │   ├── ocr/               # Receipt OCR parsing and item extraction
│   │   │   ├── trips/             # Trip CRUD, expenses, settlement, members, CFO
│   │   │   └── user/              # User profile and notification endpoints
│   │   ├── explore/               # Interactive map and destination discovery
│   │   ├── trips/                 # Trip dashboard, workspace, expense logger
│   │   │   ├── [id]/              # Specific trip view, itinerary, and settlement
│   │   │   │   ├── ai-planner/    # AI travel itinerary workspace
│   │   │   │   └── summary/       # Editorial keepsake trip summary
│   │   │   └── new/               # New trip creation wizard
│   │   ├── globals.css            # Editorial design tokens and typography
│   │   ├── layout.tsx             # Root application shell and fonts
│   │   └── page.tsx               # Landing page & feature showcase
│   ├── components/
│   │   ├── budget/                # Category caps, breach alerts, comparative analysis
│   │   ├── charts/                # Budget allocation donut chart
│   │   ├── expenses/              # Smart bill dock, itemized claims, NLP split modal
│   │   ├── finance/               # AI CFO Advisor card and health score gauge
│   │   ├── itinerary/             # Dynamic day timeline and activity slots
│   │   ├── maps/                  # Leaflet interactive map component
│   │   ├── navigation/            # Global responsive navigation bar
│   │   ├── planner/               # AI itinerary generator and contextual assistant
│   │   ├── settlement/            # UPI QR modal and debt payment card
│   │   └── ui/                    # Editorial design system components
│   └── lib/
│       ├── ai/                    # Gemini API, NLP expense engine, comparative analysis
│       ├── auth/                  # JWT session cookies and password hashing
│       ├── budget/                # Minor-unit budget engine and category caps
│       ├── db/                    # Prisma client and in-memory store
│       ├── expenses/              # 4-strategy split engine and CFO burn rate analyzer
│       ├── itinerary/             # Clustered multi-day schedule generator
│       ├── maps/                  # OpenStreetMap geocoding and POI aggregation
│       ├── providers/             # Adapters: Frankfurter, Nominatim, Overpass, Amadeus
│       └── settlement/            # Greedy minimum-cash-flow graph debt simplifier
├── tests/                         # Automated test suite (24 passing test suites)
│   ├── category-caps.test.ts      # Decimal arithmetic, FX conversion, cap breaches
│   ├── cfo.test.ts                # Health score, burn rate velocity, concentration risk
│   ├── comparative-analysis.test.ts # AI comparative spend, receipt line attribution
│   ├── nlp-expense-chat.test.ts   # Natural language expense parsing & zero-drift splits
│   ├── ocr-itemized.test.ts       # Receipt OCR, proportional GST, subset splitting
│   ├── upi-actualize.test.ts      # UPI deep links, base64 QR generation, itinerary actualize
│   └── run-tests.ts               # Master test runner
├── docs/
│   └── FULL_PROJECT_DOCUMENTATION.txt # Complete architectural specification & methodology
├── .env.example                   # Environment configuration template
├── package.json                   # Project dependencies and run scripts
├── tsconfig.json                  # TypeScript compiler settings
└── README.md                      # 📍 You are here
```

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Navigate into the Project

```bash
cd 02-wander-wallet-travel-planner
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy the provided `.env.example` into a local `.env`:

```bash
cp .env.example .env
```

*(Note: Wander Wallet works out-of-the-box with built-in fallbacks! No external API keys are required to explore maps, create trips, or test settlements.)*

### 4. Initialize Database Schema

```bash
npx prisma generate
```

### 5. Start the Development Server

```bash
npm run dev
```

Open your browser and visit: **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

Wander Wallet includes an automated test suite verifying mathematical correctness, zero-rounding drift, graph debt simplification, receipt proportional tax splits, and UPI generation:

```bash
npm test
```

### Test Coverage Highlights (24 Suites — 100% Pass Rate)

| # | Test Suite | Verified Invariant |
|---|------------|-------------------|
| 1–4 | **Provider Fallbacks & Safety** | Graceful error handling, price safety (`PRICE_UNAVAILABLE`), credential fallback |
| 5–10 | **Minor-Unit Budget Engine** | Exact zero-drift minor unit allocation across 6 standard categories |
| 11–14 | **Split Strategies & Rounding** | Equal, exact, percentage splits; integer remainder absorption guarantee |
| 15–17 | **Multi-Day & Multi-Currency** | 1-to-14 day itinerary pacing; live ECB currency conversions |
| 18 | **AI Group CFO & Payer Burden** | Health score (0–100), daily burn pacing, single-payer concentration risk (>60%) |
| 19–20 | **OCR Receipt & Subset Splitting** | Proportional GST allocation (Veg vs Non-Veg, Drinkers vs Non-Drinkers) |
| 21 | **Category Caps & Breach Alerts** | Warning at 80% threshold, breach at >100% capacity with foreign FX conversions |
| 22 | **Comparative Spend Analysis** | Identification of overspend drivers and budget kitty top-up calculations |
| 23 | **NLP Expense Chat Engine** | Natural language parsing of expenses and participants with zero-remainder splits |
| 24 | **UPI QR & Itinerary Actualize** | Standard NPCI UPI URL construction, base64 QR generation, itinerary one-tap booking |

---

## 🌐 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trips` | Retrieve user trips |
| `POST` | `/api/trips` | Create a new trip with budget allocation |
| `GET` | `/api/trips/:id` | Fetch complete trip details, members, and expenses |
| `POST` | `/api/trips/:id/expenses` | Log a new shared or personal expense with split rules |
| `GET` | `/api/trips/:id/settlement` | Compute minimum-cash-flow graph settlement balances |
| `GET` | `/api/trips/:id/cfo` | Run AI CFO analysis (Health score, burn velocity, concentration) |
| `POST` | `/api/ocr/scan` | Parse uploaded receipt image and extract itemized line items |
| `POST` | `/api/ai/planner` | Generate contextual multi-day travel itinerary |
| `POST` | `/api/ai/chat` | Conversational financial and itinerary travel assistant |

---

## 📖 Full Documentation

For deep technical details, architectural whitepapers, and mathematical proofs, refer to:
- [`docs/FULL_PROJECT_DOCUMENTATION.txt`](./docs/FULL_PROJECT_DOCUMENTATION.txt) — Architectural specification, mathematical invariants, and complete project report.
- [`HACKATHON.md`](./HACKATHON.md) — Problem statement alignment, MVP coverage, and data-model compliance.

---

*Wander Wallet — Built with precision for seamless, stress-free group adventures.*