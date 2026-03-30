---
name: add-prisma-model
description: Add a new Prisma model to the database schema with full migration, type export, and seed data. Use when adding a new database table, extending an existing model, or adding pgvector embedding fields.
---

# Add a Prisma Model

## Step 1 — Add to schema

File: `apps/web/prisma/schema.prisma`

```prisma
model MyModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // your fields here
}
```

If this model needs a pgvector embedding:
```prisma
  embedding Unsupported("vector(768)")?
  @@index([embedding], type: Hnsw(m: 16, efConstruction: 64))
```

## Step 2 — Run migration

```bash
pnpm --filter web prisma migrate dev --name add-my-model
pnpm --filter web prisma generate
```

Check that `apps/web/prisma/migrations/` has the new file.

## Step 3 — Export the type

In `packages/types/src/index.ts`, add:
```ts
export type { MyModel } from '@prisma/client'
// Or define a custom type if Prisma type needs extending
export type MyModelWithRelations = MyModel & { user: Pick<User, 'id' | 'name'> }
```

## Step 4 — Add seed data if needed

In `apps/web/prisma/seed.ts`:
```ts
await prisma.myModel.createMany({ data: seedData, skipDuplicates: true })
```

Run: `pnpm db:seed`

## Step 5 — Add Zod schema for API validation

In `apps/web/src/lib/schemas/my-model.ts`:
```ts
import { z } from 'zod'
export const CreateMyModelSchema = z.object({ ... })
```

## Common mistakes to avoid
- Forgetting `onDelete: Cascade` on userId foreign keys
- Not running `prisma generate` after migrate
- Putting types in `apps/web/` instead of `packages/types/`
