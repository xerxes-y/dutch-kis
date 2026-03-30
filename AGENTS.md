# AGENTS.md — Dutch KIS Multi-Agent Guide

This file coordinates multiple AI agents working on this codebase.
Read it fully before making any changes.

---

## Project in one sentence

An AI-powered Dutch language learning platform that builds a personal **weakness map**
per user and generates fully adaptive content targeting their exact gaps.

## The single most important constraint

**Every feature must update the weakness map.**
If a new learning mode, exercise, or game does not call `updateWeaknessMap()` at the end
of a session, it is incomplete. The weakness map is the brain of the system.

---

## Agent phases and ownership

| Phase | Scope | Key files |
|---|---|---|
| **Phase 1 — Foundation** | Docker Compose, auth, DB schema, Ollama wiring | `docker-compose.yml`, `apps/web/prisma/`, `apps/web/src/lib/` |
| **Phase 2 — Weakness Map** | BKT scoring, D3 visualization, Free-Write | `apps/web/src/lib/bkt.ts`, `apps/web/src/lib/weakness-map.ts`, `apps/web/src/app/api/weakness/` |
| **Phase 3 — Conversation & Phonetics** | Roleplay engine, Phonetic Studio, De/Het Oracle | `apps/web/src/app/(modes)/roleplay/`, `apps/web/src/app/(modes)/phonetic/`, `apps/web/src/app/(modes)/dehet/` |
| **Phase 4 — Story & SRS** | Story Engine, FSRS deck, Document Library | `apps/web/src/app/(modes)/story/`, `apps/web/src/lib/fsrs.ts`, `apps/web/src/app/(modes)/documents/` |
| **Phase 5 — Intelligence** | Session memory, BullMQ jobs, coaching report | `apps/web/src/lib/session-memory.ts`, `apps/web/src/worker/`, `apps/web/src/lib/coaching.ts` |
| **Phase 6 — iOS** | Expo monorepo, shared packages, push notifications | `apps/mobile/`, `packages/api/`, `packages/stores/` |

## Agent handoff rules

- An agent finishing a phase must leave all TypeScript types in `packages/types/src/index.ts` for the next agent
- Never leave `TODO` comments — either implement or open a GitHub issue
- Run `pnpm typecheck && pnpm lint` before considering any task done
- All API routes must be fully typed with Zod input validation

---

## Monorepo layout (memorize this)

```
apps/web/src/
  app/              Next.js App Router pages and API routes
    (modes)/        Learning mode pages (roleplay, story, phonetic, etc.)
    api/            Backend API routes
  lib/              Pure business logic — NO Next.js imports here
    bkt.ts          Bayesian Knowledge Tracing implementation
    fsrs.ts         FSRS spaced repetition algorithm
    weakness-map.ts Weakness map update orchestration
    session-memory.ts Cross-session AI context retrieval
    ollama.ts       Ollama API client (streaming)
    nlp.ts          SpaCy NLP service client
  worker/           BullMQ job handlers (document processing, email)
  components/       React components
  prisma/           Prisma schema and migrations

packages/
  types/src/index.ts    ALL shared types exported here
  api/src/index.ts      Shared fetch hooks
  stores/src/index.ts   Shared Zustand stores
  ui/src/index.ts       Shared primitive components

services/nlp/main.py    Python SpaCy service
```

---

## Core algorithms — do not reimplement, use these

| Algorithm | File | Purpose |
|---|---|---|
| BKT (Bayesian Knowledge Tracing) | `apps/web/src/lib/bkt.ts` | Update weakness map sub-axis scores |
| FSRS | `apps/web/src/lib/fsrs.ts` (wraps `ts-fsrs`) | Schedule SRS reviews |
| i+1 calibration | `apps/web/src/lib/story-calibration.ts` | Calibrate story difficulty |
| Frustration detection | `apps/web/src/lib/engagement.ts` | Adapt difficulty mid-session |

---

## Environment services (all available via Docker Compose)

| Service | How to call | Base URL env var |
|---|---|---|
| Ollama AI | `import { ollama } from '@/lib/ollama'` | `OLLAMA_BASE_URL` |
| SpaCy NLP | `import { nlp } from '@/lib/nlp'` | `NLP_BASE_URL` |
| Coqui TTS | `import { tts } from '@/lib/tts'` | `TTS_BASE_URL` |
| MinIO storage | `import { storage } from '@/lib/storage'` | `MINIO_ENDPOINT` |
| BullMQ queues | `import { queue } from '@/lib/queue'` | `REDIS_URL` |

---

## What agents must NEVER do

- Commit `.env` files (only `.env.example`)
- Put business logic inside React components or API route handlers (belongs in `lib/`)
- Make synchronous calls to Ollama from API routes without streaming
- Skip Zod validation on any API input
- Update weakness map scores with raw arithmetic (+3/-2) — always use BKT via `lib/bkt.ts`
- Hardcode Dutch vocabulary — use the seeded database via Prisma
