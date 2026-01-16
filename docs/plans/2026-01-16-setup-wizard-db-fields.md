# Setup Wizard DB Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single DATABASE_URL input with a two-step wizard that collects DB host/port/user/password/db separately, then admin credentials, and builds DATABASE_URL server-side.

**Architecture:** Add a small helper to build a PostgreSQL connection string from discrete fields, update the setup completion handler to accept either a full URL or discrete fields, and update the wizard UI to a two-step flow (DB step → Admin step) reusing existing XP-style classes.

**Tech Stack:** Next.js App Router, TypeScript, Vitest.

---

### Task 1: Build database URL helper + tests

**Files:**
- Create: `src/lib/buildDatabaseUrl.ts`
- Create: `src/lib/__tests__/build-database-url.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildDatabaseUrl } from "../buildDatabaseUrl";

describe("buildDatabaseUrl", () => {
  it("builds a postgres url with encoded credentials", () => {
    const result = buildDatabaseUrl({
      host: "db",
      port: "5432",
      user: "desk",
      password: "pa ss",
      database: "desktop",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("postgresql://desk:pa%20ss@db:5432/desktop");
    }
  });

  it("rejects missing fields", () => {
    const result = buildDatabaseUrl({
      host: "",
      port: "",
      user: "",
      password: "",
      database: "",
    });
    expect(result.ok).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/build-database-url.test.ts`

Expected: FAIL with "Cannot find module '../buildDatabaseUrl'"

**Step 3: Write minimal implementation**

```ts
type DbParts = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

type Result = { ok: true; value: string } | { ok: false; error: string };

export function buildDatabaseUrl(input: DbParts): Result {
  const host = input.host.trim();
  const port = input.port.trim();
  const user = input.user.trim();
  const password = input.password.trim();
  const database = input.database.trim();
  if (!host || !port || !user || !password || !database) {
    return { ok: false, error: "Missing database fields" };
  }
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return {
    ok: true,
    value: `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/build-database-url.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/buildDatabaseUrl.ts src/lib/__tests__/build-database-url.test.ts
git commit -m "test: add build database url helper"
```

---

### Task 2: Handler accepts DB fields + tests

**Files:**
- Modify: `src/app/api/setup/complete/handler.test.ts`
- Modify: `src/app/api/setup/complete/handler.ts`

**Step 1: Write the failing test**

```ts
it("builds database url from db fields", async () => {
  let received: { databaseUrl?: string } | null = null;
  const response = await handleSetupComplete(makeRequest({
    dbHost: "db",
    dbPort: "5432",
    dbUser: "desktop",
    dbPassword: "desktop",
    dbName: "desktop",
    email: "admin@test.dev",
    password: "Password1!",
  }), {
    completeSetup: async (input) => {
      received = input;
      return { status: "ok" };
    },
    ...baseDeps,
  });

  expect(response.status).toBe(200);
  expect(received?.databaseUrl).toBe("postgresql://desktop:desktop@db:5432/desktop");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/setup/complete/handler.test.ts`

Expected: FAIL with assertion on databaseUrl

**Step 3: Write minimal implementation**

```ts
import { buildDatabaseUrl } from "@/lib/buildDatabaseUrl";

const rawDatabaseUrl = String(body?.databaseUrl ?? "");
const dbFromFields = buildDatabaseUrl({
  host: String(body?.dbHost ?? ""),
  port: String(body?.dbPort ?? ""),
  user: String(body?.dbUser ?? ""),
  password: String(body?.dbPassword ?? ""),
  database: String(body?.dbName ?? ""),
});
const databaseUrl = rawDatabaseUrl || (dbFromFields.ok ? dbFromFields.value : "");

const result = await deps.completeSetup({
  databaseUrl,
  email: String(body?.email ?? ""),
  password: String(body?.password ?? ""),
}, deps.createDefaultSetupDeps());
```

If no databaseUrl and db fields are missing, allow `completeSetup` to return "invalid" via existing validation.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/setup/complete/handler.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/setup/complete/handler.ts src/app/api/setup/complete/handler.test.ts src/lib/buildDatabaseUrl.ts
git commit -m "feat: accept db fields in setup handler"
```

---

### Task 3: Wizard layout tests for DB fields + step flow

**Files:**
- Modify: `src/app/setup/__tests__/setup-wizard-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
it("renders host/port/user/password/db fields on db step", () => {
  const html = renderToString(
    <SetupWizardLayout {...baseProps} step="db" />
  );
  expect(html).toContain("Host");
  expect(html).toContain("Port");
  expect(html).toContain("User");
  expect(html).toContain("Password");
  expect(html).toContain("Database");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: FAIL with missing text

**Step 3: Write minimal implementation**

Update `SetupWizardLayout` props to include `step: "db" | "admin"` and render DB fields only on the db step; admin fields on the admin step.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/__tests__/setup-wizard-layout.test.tsx src/app/setup/SetupWizard.tsx
git commit -m "test: add wizard db step layout"
```

---

### Task 4: Wizard state + payload wiring

**Files:**
- Modify: `src/app/setup/SetupWizard.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing test**

```tsx
it("shows next button on db step and submit on admin step", () => {
  const dbHtml = renderToString(
    <SetupWizardLayout {...baseProps} step="db" />
  );
  const adminHtml = renderToString(
    <SetupWizardLayout {...baseProps} step="admin" />
  );
  expect(dbHtml).toContain("Далее");
  expect(adminHtml).toContain("Запустить настройку");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: FAIL with missing button text

**Step 3: Write minimal implementation**

- Add state for db fields: `dbHost`, `dbPort`, `dbUser`, `dbPassword`, `dbName`.
- Add `step` state defaulting to `"db"` when status is `needsSetup`, else `"admin"`.
- Add a “Далее” button (type=button) that validates db fields before moving to admin step.
- Add “Назад” button when on admin step and initial status is `needsSetup`.
- Submit payload includes db fields plus admin credentials; keep `databaseUrl` empty.
- Show a short hint near DB fields: “Для docker-compose host=db”.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/SetupWizard.tsx src/app/globals.css src/app/setup/__tests__/setup-wizard-layout.test.tsx
git commit -m "feat: add wizard db step flow"
```

---

## Manual Verification
- In Docker, open `/setup`, enter host `db`, port `5432`, user `desktop`, password `desktop`, db `desktop`.
- Proceed to admin step, create admin, confirm success screen.
- Use `/login` to sign in.
