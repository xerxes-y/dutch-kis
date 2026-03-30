---
name: agent-handoff
description: Checklist and workflow for completing a phase and handing off to the next agent. Use at the END of every implementation phase before committing. Ensures type safety, conventions compliance, and clean git state for the next agent.
---

# Agent Handoff Checklist

Run this at the END of your phase before committing.

## Step 1 — Type Safety

```bash
cd /Users/khashayar/project/dutch-kis
pnpm --filter web typecheck
```

Fix ALL TypeScript errors before proceeding. Zero tolerance.

## Step 2 — Export Shared Types

Any new types used by more than one file must be exported from `packages/types/src/index.ts`:

```ts
// packages/types/src/index.ts
export type { WeaknessScores } from '../../../apps/web/src/lib/weakness-map'
// OR define standalone types here
export interface MyNewType { ... }
```

## Step 3 — Verify Weakness Map Wiring

Every new learning mode must have:

```ts
// ✅ in the mode's API route — called after every answer
await updateSubAxis(userId, 'grammar.myAxis', { correct, responseTimeMs })

// ✅ at session end
await endSession(userId, sessionId)

// ✅ session continuity updated
await prisma.sessionContinuity.upsert({ ... lastMode: 'my-mode', canResume: true })
```

If your mode doesn't call these three, it is INCOMPLETE.

## Step 4 — Lint

```bash
pnpm --filter web lint
```

Fix all errors. Warnings are acceptable.

## Step 5 — Commit and Push

```bash
cd /Users/khashayar/project/dutch-kis
git add .
git status   # review what you're committing
git commit -m "feat(phase-N): short description of what was built"
git push origin main
```

## Step 6 — Leave a Note for the Next Agent

Add a comment at the top of the most important new file you created:

```ts
// PHASE N COMPLETE — Next agent (Phase N+1) should build on top of:
// - lib/my-new-lib.ts (exports: myFunction, MyType)
// - app/api/my-route/route.ts (POST /api/my-route)
// See AGENTS.md Phase N+1 for what to build next.
```

## What Each Agent Must NOT Do

- Modify files owned by a different phase (check AGENTS.md ownership table)
- Create duplicate implementations of BKT, FSRS, or session memory
- Leave `any` types that weren't there before
- Commit `.env` or `.env.local` files
- Skip Zod validation on new API routes
- Use raw score arithmetic instead of `updateSubAxis()` from `lib/bkt.ts`

## Opening Prompt for the NEXT Agent

After pushing, share this with the next agent:

```
Read AGENTS.md and all .cursor/rules/*.mdc files first.
Run: git pull origin main && git log --oneline -5

Phase N is complete. You are implementing Phase N+1.
Your scope is defined in AGENTS.md under "Phase N+1".
Read the existing src/ code before writing anything new.
Use the handoff comments in recently modified files as your starting point.
When done: run the agent-handoff skill checklist, then commit and push.
```
