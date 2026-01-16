# Setup Migration Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure setup completes even when migrations are missing by falling back to `prisma db push`, while also adding an initial migration to the repo.

**Architecture:** Add a small helper to choose migration mode based on migrations directory content, update setup runner to use `migrate deploy` or `db push`, and generate the initial Prisma migration (tracked in git).

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma.

---

### Task 1: Migration mode helper + tests

**Files:**
- Create: `src/lib/setupMigrations.ts`
- Create: `src/lib/__tests__/setup-migrations.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { pickMigrationMode } from "../setupMigrations";

describe("pickMigrationMode", () => {
  it("uses deploy when migrations exist", () => {
    expect(pickMigrationMode(["20260116_init"]).mode).toBe("deploy");
  });

  it("uses push when migrations are missing", () => {
    expect(pickMigrationMode([]).mode).toBe("push");
    expect(pickMigrationMode(null).mode).toBe("push");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/setup-migrations.test.ts`

Expected: FAIL with "Cannot find module '../setupMigrations'"

**Step 3: Write minimal implementation**

```ts
export type MigrationMode = "deploy" | "push";

export function pickMigrationMode(entries: string[] | null) {
  if (!entries || entries.length === 0) {
    return { mode: "push" as const };
  }
  return { mode: "deploy" as const };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/setup-migrations.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/setupMigrations.ts src/lib/__tests__/setup-migrations.test.ts
git commit -m "test: add setup migration mode helper"
```

---

### Task 2: Use migration mode in setup runner

**Files:**
- Modify: `src/lib/setupCompletion.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { pickMigrationMode } from "../setupMigrations";

describe("pickMigrationMode", () => {
  it("returns push when entries missing", () => {
    expect(pickMigrationMode(null).mode).toBe("push");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/setup-migrations.test.ts`

Expected: FAIL if helper not wired (after Task 1 it will pass; this is a quick sanity step).

**Step 3: Write minimal implementation**

```ts
import { readdir } from "node:fs/promises";
import { pickMigrationMode } from "./setupMigrations";

runMigrations: async () => {
  const prismaBin = resolve(process.cwd(), "node_modules/.bin/prisma");
  const migrationsDir = resolve(process.cwd(), "prisma/migrations");
  let entries: string[] | null = null;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    entries = null;
  }
  const mode = pickMigrationMode(entries);
  const args = mode.mode === "deploy" ? ["migrate", "deploy"] : ["db", "push"];
  await execFileAsync(prismaBin, args, { env: process.env });
};
```

**Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/setup-migrations.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/setupCompletion.ts
git commit -m "feat: fallback to prisma db push when migrations missing"
```

---

### Task 3: Add initial Prisma migration (tracked)

**Files:**
- Create: `prisma/migrations/*`
- Create: `src/lib/__tests__/migrations.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

describe("migrations", () => {
  it("has an initial migration in repo", () => {
    const dir = join(process.cwd(), "prisma/migrations");
    expect(existsSync(dir)).toBe(true);
    const entries = readdirSync(dir).filter((entry) =>
      statSync(join(dir, entry)).isDirectory()
    );
    expect(entries.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/migrations.test.ts`

Expected: FAIL because migrations directory is empty

**Step 3: Generate initial migration**

Run (Postgres must be available):

```bash
DATABASE_URL=postgresql://desktop:desktop@localhost:5432/desktop npx prisma migrate dev --name init --create-only
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/migrations.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add prisma/migrations src/lib/__tests__/migrations.test.ts
git commit -m "feat: add initial prisma migration"
```

---

## Manual Verification
- With no migrations folder, setup should run `prisma db push` and create tables.
- With migrations present, setup should run `prisma migrate deploy` and create tables.
