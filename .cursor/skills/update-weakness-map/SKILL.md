---
name: update-weakness-map
description: Add weakness tracking to an existing or new feature. Use when a feature needs to read from or write to the weakness map, add a new sub-axis, or wire up the pattern alert system.
---

# Update Weakness Map

## Reading the current map (for content generation)

```ts
import { getWeaknessMap } from '@/lib/weakness-map'
const map = await getWeaknessMap(userId)
// map.grammar.separableVerbs → 0-100 (BKT probability × 100)
// map.vocabulary.work → 0-100
```

## Writing a score update (always via BKT)

```ts
import { updateSubAxis } from '@/lib/bkt'

await updateSubAxis(userId, 'grammar.separableVerbs', {
  correct: true,
  responseTimeMs: 2400,
  confidenceLevel: 'unsure',   // optional but improves BKT accuracy
})
```

## Adding a new sub-axis

1. Add the key to `WeaknessMapSchema` in `packages/types/src/index.ts`:
```ts
export const WeaknessMapSchema = z.object({
  grammar: z.object({
    separableVerbs: z.number().min(0).max(100),
    myNewAxis: z.number().min(0).max(100).default(50),  // add here
  }),
  // ...
})
```

2. Add BKT parameters in `apps/web/src/lib/bkt.ts`:
```ts
const BKT_PARAMS: Record<SubAxis, BKTParams> = {
  'grammar.myNewAxis': { pKnow: 0.3, pLearn: 0.2, pSlip: 0.1, pGuess: 0.2 },
}
```

3. Add to the native language pre-weight table in `apps/web/src/lib/native-language-weights.ts`

4. Add to the `WEAKNESS_TO_MODE` routing table in `apps/web/src/lib/smart-start.ts`

5. Run `pnpm --filter web prisma migrate dev --name add-weakness-sub-axis`
   (WeaknessMap.scores JSON column — Prisma migration may not be needed, just update the type)

## Checking pattern alerts

```ts
import { checkPatternAlert } from '@/lib/pattern-alert'
const alert = await checkPatternAlert(userId, sessionId, 'grammar.separableVerbs')
if (alert) {
  // return mini-lesson content to client
}
```

## Saving a snapshot (end of every session)

```ts
import { saveWeaknessSnapshot } from '@/lib/weakness-map'
await saveWeaknessSnapshot(userId, sessionId)
```
