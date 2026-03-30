# Architecture

## Monorepo Layout

```
dutch-kis/
├── apps/
│   ├── web/          Next.js 15 — main web application
│   └── mobile/       Expo React Native — iOS/Android app
├── packages/
│   ├── api/          Shared fetch client hooks (used by web + mobile)
│   ├── types/        Shared TypeScript types + Prisma-generated types
│   ├── stores/       Shared Zustand state (synced between web + mobile)
│   └── ui/           Shared primitive components (Text, Button, Card)
├── services/
│   └── nlp/          Python FastAPI + SpaCy Dutch NLP service
├── nginx/            Reverse proxy config
├── docs/             Architecture and design documents
└── docker-compose.yml
```

## Data Flow — Learning Session

```
User action (Free-Write / Roleplay / Exercise)
  │
  ▼
SpaCy NLP Service (/analyze)
  → Tokenize, POS-tag, lemmatize, dependency-parse Dutch text
  │
  ▼
Ollama (llama3.2)
  → System prompt includes:
     • User's weakness map (current sub-axis scores)
     • Top-3 session memories (retrieved via pgvector cosine search)
     • User's learning goal path + correction style preference
     • SpaCy pre-analysis of the text
  → Streams correction / response back to client
  │
  ▼
Mistake Fingerprinting
  → Tag each mistake: INTERFERENCE / UNKNOWN / CONFUSION / CARELESS
  → Store in `Mistake` table with root cause + responseTimeMs
  │
  ▼
Weakness Map Update (Bayesian Knowledge Tracing)
  → Update sub-axis probabilities
  → Save WeaknessMapSnapshot for history
  │
  ▼
Pattern Alert Check
  → If same mistake category ≥ 3× in session → fire mini-lesson
  │
  ▼
Session Memory
  → Generate session summary → embed with nomic-embed-text
  → Store in SessionMemory table for future cross-session AI context
```

## Intelligence Stack

### FSRS (Free Spaced Repetition Scheduler)
Used for the SRS deck. Models four per-card properties per user:
- `difficulty` — inherent hardness of the item
- `stability` — how long the memory persists after a successful review
- `retrievability` — probability of recall right now
- `elapsed_days` — days since last review

Library: `ts-fsrs` (TypeScript)

### Bayesian Knowledge Tracing (BKT)
Used for weakness map sub-axis scores. Four parameters:
- `p_know` — prior probability of knowing the skill
- `p_learn` — probability of learning from a practice event
- `p_slip` — probability of wrong answer despite knowing
- `p_guess` — probability of right answer despite not knowing

Each sub-axis has its own BKT state per user. Updated after every answer event.

### i+1 Calibration
Story Engine measures % of known vocabulary in each generated text.
Target: 75–85% known words. If outside window → regenerate.

## Document Library (RAG Pipeline)

```
Upload file (PDF / DOCX / TXT / image)
  │
  ▼ BullMQ job enqueued
  │
  ▼ Worker process
  → Extract text: pdf-parse / mammoth / Tesseract.js (OCR)
  → Chunk text: ~500 tokens, 50-token overlap
  → Embed each chunk: nomic-embed-text via Ollama
  → Store chunks + embeddings in DocumentChunk table (pgvector)
  → Update Document.status = "ready"
  │
  ▼ At inference time
  → Query: embed user's current text/question
  → pgvector cosine search: retrieve top-5 relevant chunks
  → Inject chunks into Ollama system prompt as reference context
```

## Session Memory (Cross-Session Context)

After every session:
1. Generate structured summary (mistakes, vocabulary, topics, confidence signals)
2. Embed summary with `nomic-embed-text`
3. Store in `SessionMemory` table

At session start:
1. Embed current session context (goal, current topic, recent mistakes)
2. pgvector cosine search against all past session summaries
3. Retrieve top-3 most relevant
4. Inject into Ollama system prompt

## Behavioral Intelligence Signals

| Signal | Source | Used for |
|---|---|---|
| `responseTimeMs` | Client → AnswerEvent table | FSRS confidence weighting, careless mistake detection |
| Session accuracy rate | AnswerEvent aggregation | Frustration / boredom detection |
| Time-of-day | AnswerEvent timestamp | Learning profile optimization |
| Input vs output time | Session mode tracking | Coaching report imbalance detection |
| Session abandonment | Session duration < 3min | Quick-win re-engagement next open |
