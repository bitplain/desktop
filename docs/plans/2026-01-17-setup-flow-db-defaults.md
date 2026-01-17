# Setup Flow DB Defaults Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the secrets step from setup, accept DB host/port/user/password with a fixed database name, auto-create the database on first connection, and stop redirect loops by honoring env config.

**Architecture:** Setup UI collects DB connection fields and admin credentials only. The API always builds the database URL using a fixed `desktop` database name and generates secrets automatically. Runtime config loads from `/data/config.json` or environment variables, and setup creates the database before running Prisma migrations.

**Tech Stack:** Next.js App Router, Prisma, Postgres, Vitest

---

### Task 1: Runtime config env fallback

**Files:**
- Modify: `src/lib/runtimeConfig.ts`
- Test: `src/lib/__tests__/runtime-config.test.ts`

**Step 1: Write the failing test**

```ts
it("falls back to env vars when config file is missing", () => {
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@db:5432/desktop");
  vi.stubEnv("NEXTAUTH_SECRET", "secret1234567890abcd");
  vi.stubEnv("KEYS_ENCRYPTION_SECRET", "secret1234567890abcd");
  const load = loadRuntimeConfig({ mockConfig: null });
  expect(load?.databaseUrl).toBe("postgresql://user:pass@db:5432/desktop");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/runtime-config.test.ts`
Expected: FAIL (loadRuntimeConfig returns null)

**Step 3: Write minimal implementation**

```ts
export function loadRuntimeConfig(options?: { mockConfig?: RuntimeConfig | null }) {
  const config = options?.mockConfig ?? readConfigFile(resolveConfigPath());
  const envConfig = buildEnvConfig();
  const resolved = config ?? envConfig;
  if (!resolved) {
    return null;
  }
  process.env.DATABASE_URL ||= resolved.databaseUrl;
  process.env.NEXTAUTH_SECRET ||= resolved.nextAuthSecret;
  process.env.KEYS_ENCRYPTION_SECRET ||= resolved.keysEncryptionSecret;
  return resolved;
}

function buildEnvConfig(): RuntimeConfig | null {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || "";
  const keysEncryptionSecret = process.env.KEYS_ENCRYPTION_SECRET?.trim() || "";
  if (!databaseUrl || !nextAuthSecret || !keysEncryptionSecret) {
    return null;
  }
  return { databaseUrl, nextAuthSecret, keysEncryptionSecret };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/runtime-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/runtimeConfig.ts src/lib/__tests__/runtime-config.test.ts
git commit -m "fix: allow env runtime config fallback"
```

### Task 2: Setup UI cleanup (no secrets step, no DB name, no placeholders)

**Files:**
- Modify: `src/app/setup/SetupWizard.tsx`
- Modify: `src/app/setup/__tests__/setup-wizard-layout.test.tsx`

**Step 1: Write the failing test**

```ts
it("omits database name and secrets step", () => {
  const html = renderToString(<SetupWizardLayout {...baseProps} step="db" />);
  expect(html).not.toContain("Database");
  expect(html).not.toContain("Конфигурация и секреты");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`
Expected: FAIL (still contains Database and step text)

**Step 3: Write minimal implementation**

```tsx
<div className="setup-steps">
  <div className="setup-step">1. База данных</div>
  <div className="setup-step">2. Администратор</div>
</div>
```

```tsx
<label className="setup-field">
  <span>Host</span>
  <input className="xp-input" value={dbHost} onChange={...} required />
</label>
```

- Remove `databaseUrl` and `dbName` state/props.
- Remove the database name field.
- Remove placeholders and the `setup-note` about docker host.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/SetupWizard.tsx src/app/setup/__tests__/setup-wizard-layout.test.tsx
git commit -m "ui: simplify setup wizard db step"
```

### Task 3: Fixed database name in setup API

**Files:**
- Modify: `src/app/api/setup/complete/handler.ts`
- Modify: `src/app/api/setup/complete/handler.test.ts`

**Step 1: Write the failing test**

```ts
const response = await handleSetupComplete(
  makeRequest({
    dbHost: "db",
    dbPort: "5432",
    dbUser: "desktop",
    dbPassword: "desktop",
    email: "admin@test.dev",
    password: "Password1!",
  }),
  {
    completeSetup: async (input) => {
      received = input;
      return { status: "ok" };
    },
    ...baseDeps,
  }
);
expect(received?.databaseUrl).toBe("postgresql://desktop:desktop@db:5432/desktop");
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/setup/complete/handler.test.ts`
Expected: FAIL (dbName required)

**Step 3: Write minimal implementation**

```ts
const builtDatabaseUrl = buildDatabaseUrl({
  host: String(body?.dbHost ?? ""),
  port: String(body?.dbPort ?? ""),
  user: String(body?.dbUser ?? ""),
  password: String(body?.dbPassword ?? ""),
  database: "desktop",
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/setup/complete/handler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/setup/complete/handler.ts src/app/api/setup/complete/handler.test.ts
git commit -m "feat: fix setup db name to desktop"
```

### Task 4: Auto-create database before migrations

**Files:**
- Create: `src/lib/ensureDatabaseExists.ts`
- Test: `src/lib/__tests__/ensure-database-exists.test.ts`
- Modify: `src/lib/setupCompletion.ts`
- Modify: `src/lib/__tests__/setup-completion.test.ts`
- Modify: `src/lib/__tests__/setup-default-deps.test.ts`

**Step 1: Write the failing test**

```ts
vi.mock("pg", () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      end: vi.fn(),
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
    })),
  };
});

it("creates database when missing", async () => {
  await ensureDatabaseExists("postgresql://user:pass@db:5432/desktop");
  const { Client } = await import("pg");
  const client = (Client as unknown as vi.Mock).mock.results[0].value;
  expect(client.query).toHaveBeenCalledWith(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    ["desktop"]
  );
  expect(client.query).toHaveBeenCalledWith('CREATE DATABASE "desktop"');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ensure-database-exists.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
import { Client } from "pg";

function getDatabaseName(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const name = url.pathname.replace("/", "").trim();
  if (!name) {
    throw new Error("Database name is required");
  }
  return { url, name };
}

function buildAdminUrl(url: URL, adminDb = "postgres") {
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = `/${adminDb}`;
  return adminUrl.toString();
}

function escapeIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function ensureDatabaseExists(databaseUrl: string) {
  const { url, name } = getDatabaseName(databaseUrl);
  const client = new Client({ connectionString: buildAdminUrl(url) });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name]
    );
    if (result.rows.length === 0) {
      await client.query(`CREATE DATABASE ${escapeIdentifier(name)}`);
    }
  } finally {
    await client.end();
  }
}
```

Update setup deps and tests:

```ts
export type SetupCompletionDeps = {
  ...
  ensureDatabaseExists: (databaseUrl: string) => Promise<void>;
};

await deps.ensureDatabaseExists(config.databaseUrl);
await deps.runMigrations();
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/ensure-database-exists.test.ts src/lib/__tests__/setup-completion.test.ts src/lib/__tests__/setup-default-deps.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ensureDatabaseExists.ts src/lib/__tests__/ensure-database-exists.test.ts src/lib/setupCompletion.ts src/lib/__tests__/setup-completion.test.ts src/lib/__tests__/setup-default-deps.test.ts
git commit -m "feat: create database before migrations"
```

### Task 5: Update setup docs

**Files:**
- Modify: `README.md`

**Step 1: Update documentation**

```md
2. Visit `/setup` to provide DB host/port/user/password and create the first admin.
```

- Remove mentions of manual secrets entry.
- Mention secrets auto-generated.
- Note fixed database name `desktop`.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update setup flow"
```
