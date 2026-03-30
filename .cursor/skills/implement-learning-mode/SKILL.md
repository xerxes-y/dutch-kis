---
name: implement-learning-mode
description: Implement a new Dutch learning mode (e.g. Separable Verb Trainer, Word Order Puzzle, De/Het Oracle). Use when adding a new exercise mode, game, or practice activity to the app. Covers page scaffold, API route, weakness map wiring, and session continuity.
---

# Implement a New Learning Mode

## Checklist

- [ ] 1. Create the page
- [ ] 2. Create the API route
- [ ] 3. Wire weakness map update
- [ ] 4. Wire session continuity
- [ ] 5. Add to Today's Focus routing table
- [ ] 6. Write unit test for scoring logic

---

## Step 1 — Create the page

```
apps/web/src/app/(modes)/<mode-name>/
  page.tsx          UI and client state
  layout.tsx        Optional layout wrapper
```

Page must:
- Load the user's weakness map to show relevant content
- Track `responseTimeMs` on each answer (Date.now() delta)
- Show a confidence selector (Sure / Unsure / Guessing) before revealing answer
- Call the mode API route on answer submission
- Show a session summary when the user finishes

## Step 2 — Create the API route

```
apps/web/src/app/api/modes/<mode-name>/route.ts
```

```ts
// Minimum shape
export async function POST(req: NextRequest) {
  // 1. Auth check
  // 2. Zod validate input (include responseTimeMs, confidenceLevel)
  // 3. Call SpaCy NLP if analyzing Dutch text
  // 4. Call Ollama if generating content
  // 5. Call updateWeaknessMap (via lib/bkt.ts)
  // 6. Call recordMistake if wrong (with root cause)
  // 7. Check pattern alert threshold
  // 8. Return result
}
```

## Step 3 — Wire weakness map update

Identify which sub-axis this mode targets. Examples:
- Separable Verb Trainer → `grammar.separableVerbs`
- Word Order Puzzle (V2) → `grammar.v2WordOrder`
- De/Het Oracle → `grammar.deHet`
- Phonetic Studio → `pronunciation.gSchSounds` or relevant sub-axis

```ts
import { updateSubAxis } from '@/lib/bkt'
await updateSubAxis(userId, 'grammar.separableVerbs', {
  correct,
  responseTimeMs,
  confidenceLevel,
})
```

Always call `saveWeaknessSnapshot(userId, sessionId)` at session end.

## Step 4 — Wire session continuity

```ts
import { saveSessionContinuity } from '@/lib/session-continuity'
await saveSessionContinuity(userId, {
  lastMode: '<mode-name>',
  lastContext: { /* mode-specific context for resume */ },
  canResume: true,
})
```

## Step 5 — Add to Today's Focus routing table

In `apps/web/src/lib/smart-start.ts`, add an entry to `WEAKNESS_TO_MODE`:
```ts
'grammar.separableVerbs': { mode: 'separable-verb-trainer', label: 'Separable Verb Trainer' },
```

## Step 6 — Unit test the scoring logic

Extract pure scoring logic to `apps/web/src/lib/modes/<mode-name>.ts` and test it with Vitest. The React component and API route should not contain scoring logic.
