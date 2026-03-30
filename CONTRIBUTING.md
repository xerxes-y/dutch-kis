# Contributing

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop 4+

## Setup

```bash
git clone https://github.com/xerxes-y/dutch-kis.git
cd dutch-kis
cp .env.example .env
pnpm install
docker compose up db redis -d
pnpm db:migrate
```

## Branch naming

```
feature/short-description
fix/short-description
refactor/short-description
docs/short-description
```

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add separable verb trainer mode
fix: correct BKT update formula for slip events
refactor: extract weakness map score logic to shared package
docs: add FSRS algorithm explanation to architecture docs
```

## Before opening a PR

```bash
pnpm lint
pnpm typecheck
pnpm test
```

All three must pass. CI will enforce this.

## Key design principles

1. **Weakness map is the source of truth** — every feature must feed scores back to the weakness map
2. **Native language matters** — always consider how a feature affects learners with different native languages
3. **No blocking operations in API routes** — use BullMQ for anything that takes >500ms
4. **Shared packages** — business logic that could work on mobile belongs in `packages/`, not `apps/web/`
