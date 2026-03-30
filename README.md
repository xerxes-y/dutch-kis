# Dutch KIS — AI-Powered Dutch Language Learning

An intelligent Dutch language learning platform that builds a personal **weakness map** for each user and generates fully adaptive content, conversations, and exercises targeting their exact gaps.

> Not a fixed curriculum. The system learns how you learn Dutch.

---

## What Makes This Different

| Feature | Description |
|---|---|
| **Dutch DNA Weakness Map** | Live sub-axis knowledge graph across vocabulary, grammar, pronunciation, writing, and register — pre-weighted from your native language on day one |
| **FSRS + Bayesian Knowledge Tracing** | State-of-the-art spaced repetition and knowledge probability modeling — not simple score counters |
| **Session Memory** | AI remembers your past sessions via vector embeddings — "Last week you had trouble with *opbellen*, you used it correctly today" |
| **Mistake Fingerprinting** | Every mistake tagged with root cause: `INTERFERENCE` / `UNKNOWN` / `CONFUSION` / `CARELESS` — different root causes get different remediation |
| **Separable Verb Trainer** | Dutch's most uniquely hard grammar point — dedicated trainer for all three clause positions |
| **Goal-Based Learning Paths** | Inburgering / Work / Family / Academic / Travel — the entire content focus adapts to why you're learning |
| **Native Language Pre-Configuration** | Turkish speaker ≠ German speaker — weakness map starts pre-weighted from known interference patterns |
| **Proactive Diagnostic Probing** | System tests suspected weaknesses before waiting for mistakes |
| **Self-Improving Content Loop** | A/B tests explanation styles per user; tracks exercise outcomes and adjusts generation parameters |
| **Document Library (RAG)** | Upload your own PDFs, Dutch emails, textbooks — AI teaches from your content |
| **iOS App** | Expo React Native app sharing all backend logic and state with the web app |

---

## Architecture

```
apps/
  web/          → Next.js 15 (App Router, TypeScript)
  mobile/       → Expo React Native (iOS + Android)
packages/
  api/          → Shared fetch/API client hooks
  types/        → Shared TypeScript + Prisma types
  stores/       → Shared Zustand state
  ui/           → Shared primitive components
services/
  nlp/          → Python FastAPI + SpaCy nl_core_news_sm
```

### Infrastructure (Docker Compose)

| Service | Purpose | Port |
|---|---|---|
| `web` | Next.js application | 3000 |
| `worker` | BullMQ async job worker | — |
| `db` | PostgreSQL 16 + pgvector | 5432 |
| `redis` | Cache + BullMQ queues | 6379 |
| `ollama` | Ollama AI inference | 11434 |
| `tts` | Coqui TTS Dutch voice | 5002 |
| `nlp` | SpaCy Dutch NLP service | 8001 |
| `minio` | Object storage (files + audio) | 9000 / 9001 |
| `mailpit` | Local email catcher (dev) | 1025 / 8025 |
| `glitchtip` | Self-hosted error monitoring | 8000 |
| `nginx` | Reverse proxy | 80 |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.x+
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

### 1. Clone & configure

```bash
git clone https://github.com/xerxes-y/dutch-kis.git
cd dutch-kis
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET at minimum
```

### 2. Pull AI models (one-time, ~5 GB)

```bash
docker compose up ollama -d
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull nomic-embed-text
```

### 3. Start all services

```bash
docker compose up -d
```

### 4. Install dependencies & run migrations

```bash
pnpm install
pnpm db:migrate
pnpm db:seed        # seeds OpenTaal Dutch wordlist + CEFR vocab
```

### 5. Open the app

| App | URL |
|---|---|
| Web app | http://localhost:3000 |
| MinIO console | http://localhost:9001 |
| Mailpit inbox | http://localhost:8025 |
| Error monitoring | http://localhost:8000 |

---

## Development

```bash
# Run web + worker in dev mode (hot reload)
pnpm dev

# Run only the web app
pnpm --filter web dev

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run unit tests (Vitest)
pnpm test

# Run E2E tests (Playwright)
pnpm test:e2e
```

---

## Intelligence Stack

### Algorithms
- **FSRS** (`ts-fsrs`) — Free Spaced Repetition Scheduler; models difficulty, stability, retrievability per card per user
- **Bayesian Knowledge Tracing** — probabilistic knowledge model accounting for slips and guesses
- **i+1 Calibration** — story difficulty targets 75–85% known vocabulary per user

### Behavioral Intelligence
- Response time tracking on every answer
- Frustration / boredom detection with automatic difficulty adjustment
- Time-of-day learning profile (accuracy by hour)
- Input/output balance monitoring

### Memory & Context
- Session summaries embedded via `nomic-embed-text` and stored in pgvector
- Top-3 relevant past sessions retrieved at session start and injected into AI system prompt

---

## Feature Modes

| Mode | Description |
|---|---|
| **Today's Focus** | Smart start engine — surfaces SRS due, resume, or weakest sub-axis |
| **Free-Write** | Write anything in Dutch; AI analyzes with SpaCy + Ollama, updates weakness map |
| **Conversational Roleplay** | Scenario-based conversations (bakery, job, apartment hunt) with adaptive error correction |
| **Phonetic Studio** | Waveform comparison for Dutch sounds: `g`, `ui`, `ij`, `sch` |
| **De/Het Oracle** | Article gender game backed by full OpenTaal gender database |
| **Separable Verb Trainer** | Three-stage trainer for Dutch's hardest grammar point |
| **Word Order Puzzle** | Drag-and-drop V2 rule and subordinate clause games |
| **Register Trainer** | Formal `u` vs informal `jij/je` + email structure |
| **AI Story Engine** | Micro-stories seeded with your weak vocabulary, difficulty calibrated to i+1 |
| **Spaced Repetition Deck** | Multi-modal FSRS-powered daily review (reading, listening, writing, speaking) |
| **Inburgeringsexamen Prep** | NT2 A2 curriculum, civic knowledge, timed listening tests |
| **Dutch Idiom Library** | 200+ idioms with audio, literal translation, and cultural context |
| **Document Library** | Upload PDFs/DOCX/images → RAG pipeline → AI teaches from your content |

---

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, D3.js
- **Mobile**: Expo (React Native), React Navigation, expo-av, expo-notifications
- **Backend**: Next.js API Routes, NextAuth.js v5, Prisma ORM
- **Database**: PostgreSQL 16 + pgvector extension
- **AI**: Ollama (`llama3.2`, `nomic-embed-text`), SpaCy `nl_core_news_sm`, Coqui TTS
- **Queue**: BullMQ + Redis
- **Storage**: MinIO (S3-compatible)
- **Monorepo**: Turborepo + pnpm workspaces

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All PRs require passing CI (lint, typecheck, tests).

---

## License

MIT
