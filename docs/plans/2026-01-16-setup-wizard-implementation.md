# Setup Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an XP-styled first-run setup wizard that generates secrets, writes config, runs Prisma migrations, and creates the first admin in one flow.

**Architecture:** Add a setup completion core (`completeSetup`) with dependency injection for testability, a thin API handler that maps result statuses to HTTP responses, and a client wizard UI that reuses existing login layout classes. Redirect logic is centralized in a small helper.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma, PostgreSQL.

---

### Task 1: Setup completion core + tests

**Files:**
- Create: `src/lib/setupCompletion.ts`
- Create: `src/lib/__tests__/setup-completion.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { completeSetup, type SetupCompletionDeps } from "../setupCompletion";

const baseDeps = (): SetupCompletionDeps => ({
  loadConfig: () => null,
  writeConfig: vi.fn().mockResolvedValue(undefined),
  applyConfig: vi.fn(),
  runMigrations: vi.fn().mockResolvedValue(undefined),
  getUserCount: vi.fn().mockResolvedValue(0),
  createAdmin: vi.fn().mockResolvedValue(undefined),
  generateSecret: () => "secret-1234567890",
  validateDatabaseUrl: (url) =>
    url.startsWith("postgres") ? { ok: true } : { ok: false, error: "bad" },
  validateEmail: (email) => ({ ok: true, value: email }),
  validatePassword: (password) => ({ ok: true, value: password }),
});

describe("setup completion", () => {
  it("rejects invalid database url when config is missing", async () => {
    const deps = baseDeps();
    const result = await completeSetup(
      { databaseUrl: "mysql://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("invalid");
  });

  it("writes config and creates admin when fresh", async () => {
    const deps = baseDeps();
    const result = await completeSetup(
      { databaseUrl: "postgres://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("ok");
    expect(deps.writeConfig).toHaveBeenCalledOnce();
    expect(deps.applyConfig).toHaveBeenCalledOnce();
    expect(deps.runMigrations).toHaveBeenCalledOnce();
    expect(deps.createAdmin).toHaveBeenCalledOnce();
  });

  it("skips config write when config exists", async () => {
    const deps = baseDeps();
    deps.loadConfig = () => ({
      databaseUrl: "postgres://existing",
      nextAuthSecret: "secret-aaaaaaaaaaaaaaa",
      keysEncryptionSecret: "secret-bbbbbbbbbbbbbbb",
    });
    const result = await completeSetup(
      { databaseUrl: "postgres://ignored", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("ok");
    expect(deps.writeConfig).not.toHaveBeenCalled();
  });

  it("returns alreadySetup when users exist", async () => {
    const deps = baseDeps();
    deps.getUserCount = vi.fn().mockResolvedValue(2);
    const result = await completeSetup(
      { databaseUrl: "postgres://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("alreadySetup");
    expect(deps.createAdmin).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/setup-completion.test.ts`

Expected: FAIL with "Cannot find module '../setupCompletion'"

**Step 3: Write minimal implementation**

```ts
import type { RuntimeConfig } from "./runtimeConfig";

export type SetupCompletionInput = {
  databaseUrl?: string;
  email: string;
  password: string;
};

export type SetupCompletionResult =
  | { status: "ok" }
  | { status: "invalid"; error: string }
  | { status: "alreadySetup" }
  | { status: "dbError"; error: string };

export type SetupCompletionDeps = {
  loadConfig: () => RuntimeConfig | null;
  writeConfig: (config: RuntimeConfig) => Promise<void>;
  applyConfig: (config: RuntimeConfig) => void;
  runMigrations: () => Promise<void>;
  getUserCount: () => Promise<number>;
  createAdmin: (input: { email: string; password: string }) => Promise<void>;
  generateSecret: () => string;
  validateDatabaseUrl: (value: string) => { ok: boolean; error?: string };
  validateEmail: (value: string) => { ok: boolean; value?: string; error?: string };
  validatePassword: (value: string) => { ok: boolean; value?: string; error?: string };
};

export async function completeSetup(
  input: SetupCompletionInput,
  deps: SetupCompletionDeps
): Promise<SetupCompletionResult> {
  const emailCheck = deps.validateEmail(input.email);
  if (!emailCheck.ok) {
    return { status: "invalid", error: emailCheck.error ?? "Invalid email" };
  }
  const passwordCheck = deps.validatePassword(input.password);
  if (!passwordCheck.ok) {
    return { status: "invalid", error: passwordCheck.error ?? "Invalid password" };
  }

  let config = deps.loadConfig();
  if (!config) {
    const dbCheck = deps.validateDatabaseUrl(input.databaseUrl ?? "");
    if (!dbCheck.ok) {
      return { status: "invalid", error: dbCheck.error ?? "Invalid database url" };
    }
    config = {
      databaseUrl: input.databaseUrl ?? "",
      nextAuthSecret: deps.generateSecret(),
      keysEncryptionSecret: deps.generateSecret(),
    };
    await deps.writeConfig(config);
  }

  deps.applyConfig(config);

  try {
    await deps.runMigrations();
    const count = await deps.getUserCount();
    if (count > 0) {
      return { status: "alreadySetup" };
    }
    await deps.createAdmin({ email: emailCheck.value ?? "", password: passwordCheck.value ?? "" });
    return { status: "ok" };
  } catch (error) {
    return {
      status: "dbError",
      error: error instanceof Error ? error.message : "Database error",
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/setup-completion.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/setupCompletion.ts src/lib/__tests__/setup-completion.test.ts
git commit -m "test: add setup completion core"
```

---

### Task 2: Setup completion handler + route wiring

**Files:**
- Create: `src/app/api/setup/complete/handler.ts`
- Create: `src/app/api/setup/complete/handler.test.ts`
- Create: `src/app/api/setup/complete/route.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { handleSetupComplete } from "./handler";

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/setup/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("setup complete handler", () => {
  it("maps invalid status to 400", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "invalid", error: "bad" }),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("bad");
  });

  it("maps alreadySetup to 409", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "alreadySetup" }),
    });
    expect(response.status).toBe(409);
  });

  it("maps ok to 200", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "ok" }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/setup/complete/handler.test.ts`

Expected: FAIL with "Cannot find module './handler'"

**Step 3: Write minimal implementation**

```ts
import { NextResponse } from "next/server";
import { completeSetup } from "@/lib/setupCompletion";

type SetupHandlerDeps = {
  completeSetup: typeof completeSetup;
};

export async function handleSetupComplete(
  request: Request,
  deps: SetupHandlerDeps = { completeSetup }
) {
  const body = await request.json().catch(() => ({}));
  const result = await deps.completeSetup({
    databaseUrl: String(body?.databaseUrl ?? ""),
    email: String(body?.email ?? ""),
    password: String(body?.password ?? ""),
  });

  if (result.status === "invalid") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (result.status === "alreadySetup") {
    return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
  }
  if (result.status === "dbError") {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
```

**Step 4: Wire route**

```ts
import { handleSetupComplete } from "./handler";

export async function POST(request: Request) {
  return handleSetupComplete(request);
}
```

**Step 5: Run tests**

Run: `npx vitest run src/app/api/setup/complete/handler.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/setup/complete/handler.ts src/app/api/setup/complete/handler.test.ts src/app/api/setup/complete/route.ts
git commit -m "feat: add setup completion handler"
```

---

### Task 3: Default setup deps + prisma migrate runner

**Files:**
- Modify: `src/lib/setupCompletion.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createDefaultSetupDeps } from "../setupCompletion";

describe("default setup deps", () => {
  it("generates non-empty secrets", () => {
    const deps = createDefaultSetupDeps();
    expect(deps.generateSecret().length).toBeGreaterThan(16);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/setup-default-deps.test.ts`

Expected: FAIL with "Cannot find module '../setupCompletion' export createDefaultSetupDeps" (until implemented)

**Step 3: Write minimal implementation**

```ts
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hash } from "bcryptjs";
import { loadRuntimeConfig, resolveConfigPath } from "./runtimeConfig";
import { validateDatabaseUrl } from "./setupValidation";
import { validateEmail, validatePassword } from "./validation";
import { getPrisma } from "./db";

const execFileAsync = promisify(execFile);

export function createDefaultSetupDeps(): SetupCompletionDeps {
  return {
    loadConfig: () => loadRuntimeConfig(),
    writeConfig: async (config) => {
      const path = resolveConfigPath();
      await mkdir(path.replace("/config.json", ""), { recursive: true });
      await writeFile(path, JSON.stringify(config, null, 2), { mode: 0o600 });
    },
    applyConfig: (config) => {
      loadRuntimeConfig({ mockConfig: config });
    },
    runMigrations: async () => {
      const prismaBin = resolve(process.cwd(), "node_modules/.bin/prisma");
      await execFileAsync(prismaBin, ["migrate", "deploy"], { env: process.env });
    },
    getUserCount: async () => {
      const prisma = getPrisma();
      return prisma.user.count();
    },
    createAdmin: async ({ email, password }) => {
      const prisma = getPrisma();
      const passwordHash = await hash(password, 12);
      await prisma.user.create({
        data: { email, passwordHash, role: "ADMIN" },
      });
    },
    generateSecret: () => randomBytes(32).toString("hex"),
    validateDatabaseUrl,
    validateEmail,
    validatePassword,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/setup-default-deps.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/setupCompletion.ts src/lib/__tests__/setup-default-deps.test.ts
git commit -m "feat: add setup default dependencies"
```

---

### Task 4: Setup wizard UI + layout tests

**Files:**
- Create: `src/app/setup/SetupWizard.tsx`
- Create: `src/app/setup/__tests__/setup-wizard-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { SetupWizardLayout } from "../SetupWizard";

const baseProps = {
  status: "needsSetup" as const,
  email: "",
  password: "",
  databaseUrl: "",
  loading: false,
  error: null as string | null,
  success: false,
  onChangeEmail: () => undefined,
  onChangePassword: () => undefined,
  onChangeDatabaseUrl: () => undefined,
  onSubmit: () => undefined,
  onLogin: () => undefined,
};

describe("setup wizard layout", () => {
  it("renders database url field for needsSetup", () => {
    const html = renderToString(<SetupWizardLayout {...baseProps} />);
    expect(html).toContain("DATABASE_URL");
  });

  it("hides database url field for needsAdmin", () => {
    const html = renderToString(
      <SetupWizardLayout {...baseProps} status="needsAdmin" />
    );
    expect(html).not.toContain("DATABASE_URL");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: FAIL with "Cannot find module '../SetupWizard'"

**Step 3: Write minimal implementation**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import type { SetupStatus } from "@/lib/setupStatus";

type WizardProps = {
  initialStatus: Exclude<SetupStatus, "ready">;
};

type LayoutProps = {
  status: Exclude<SetupStatus, "ready">;
  email: string;
  password: string;
  databaseUrl: string;
  loading: boolean;
  error: string | null;
  success: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeDatabaseUrl: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onLogin: () => void;
};

export function SetupWizardLayout({
  status,
  email,
  password,
  databaseUrl,
  loading,
  error,
  success,
  onChangeEmail,
  onChangePassword,
  onChangeDatabaseUrl,
  onSubmit,
  onLogin,
}: LayoutProps) {
  const needsDatabase = status === "needsSetup";

  return (
    <div className="login-screen">
      <div className="login-panel setup-panel">
        <div className="login-hero">
          <div className="login-brand">
            <span
              className="login-brand-icon"
              style={{ backgroundImage: "url(/icons/xp/window.png)" }}
              aria-hidden
            />
            <div>
              <div className="login-brand-title">Desktop</div>
              <div className="login-brand-subtitle">Первый запуск системы</div>
            </div>
          </div>
          <div className="setup-steps">
            <div className="setup-step">1. Конфигурация и секреты</div>
            <div className="setup-step">2. Миграции базы</div>
            <div className="setup-step">3. Администратор</div>
          </div>
          <div className="setup-note">Секреты будут сгенерированы автоматически.</div>
        </div>
        <div className="login-form">
          {!success ? (
            <form className="stack" onSubmit={onSubmit}>
              <div className="login-form-header">Setup wizard</div>
              {needsDatabase ? (
                <label className="setup-field">
                  <span>DATABASE_URL</span>
                  <input
                    className="xp-input"
                    value={databaseUrl}
                    onChange={(event) => onChangeDatabaseUrl(event.target.value)}
                    placeholder="postgresql://user:pass@host/db"
                    required
                  />
                </label>
              ) : (
                <div className="setup-note">База уже настроена. Создайте администратора.</div>
              )}
              <label className="setup-field">
                <span>Email администратора</span>
                <input
                  className="xp-input"
                  type="email"
                  value={email}
                  onChange={(event) => onChangeEmail(event.target.value)}
                  required
                />
              </label>
              <label className="setup-field">
                <span>Пароль администратора</span>
                <input
                  className="xp-input"
                  type="password"
                  value={password}
                  onChange={(event) => onChangePassword(event.target.value)}
                  required
                />
              </label>
              {error ? <div className="notice">{error}</div> : null}
              <button className="xp-button" type="submit" disabled={loading}>
                {loading ? "Настраиваем..." : "Запустить настройку"}
              </button>
            </form>
          ) : (
            <div className="setup-success">
              <div className="login-form-header">Готово</div>
              <div className="setup-success-list">
                <div>Конфигурация сохранена</div>
                <div>База данных подготовлена</div>
                <div>Администратор создан</div>
              </div>
              <button className="xp-button" onClick={onLogin}>
                Войти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupWizard({ initialStatus }: WizardProps) {
  const router = useRouter();
  const [status] = useState(initialStatus);
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const payload = useMemo(
    () => ({ databaseUrl, email, password }),
    [databaseUrl, email, password]
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await postJson("/api/setup/complete", payload);
    if (!result.ok) {
      const message = result.data?.error || "Ошибка настройки.";
      setError(message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setSuccess(true);
  };

  return (
    <SetupWizardLayout
      status={status}
      email={email}
      password={password}
      databaseUrl={databaseUrl}
      loading={loading}
      error={error}
      success={success}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      onChangeDatabaseUrl={setDatabaseUrl}
      onSubmit={onSubmit}
      onLogin={() => router.push("/login")}
    />
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/SetupWizard.tsx src/app/setup/__tests__/setup-wizard-layout.test.tsx
git commit -m "feat: add setup wizard layout"
```

---

### Task 5: Redirect helper + page wiring + styling

**Files:**
- Create: `src/lib/setupRoutes.ts`
- Create: `src/lib/__tests__/setup-routes.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/setup/page.tsx`
- Modify: `src/app/setup/admin/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getSetupRedirect } from "../setupRoutes";

describe("setup redirects", () => {
  it("routes needsSetup to /setup", () => {
    expect(getSetupRedirect("needsSetup")).toBe("/setup");
  });

  it("routes needsAdmin to /setup", () => {
    expect(getSetupRedirect("needsAdmin")).toBe("/setup");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/setup-routes.test.ts`

Expected: FAIL with "Cannot find module '../setupRoutes'"

**Step 3: Write minimal implementation**

```ts
import type { SetupStatus } from "./setupStatus";

export function getSetupRedirect(status: SetupStatus) {
  if (status === "needsSetup" || status === "needsAdmin") {
    return "/setup";
  }
  return null;
}
```

**Step 4: Wire pages and UI**

```tsx
// src/app/setup/page.tsx
import { redirect } from "next/navigation";
import { getSetupStatus } from "@/lib/setupStatus";
import SetupWizard from "./SetupWizard";

export default async function SetupPage() {
  const status = await getSetupStatus();
  if (status === "ready") {
    redirect("/");
  }
  if (status === "dbUnavailable") {
    return (
      <main>
        <h1>Database unavailable</h1>
        <p>Start Postgres and refresh the page.</p>
      </main>
    );
  }
  return <SetupWizard initialStatus={status} />;
}
```

```tsx
// src/app/setup/admin/page.tsx
import { redirect } from "next/navigation";

export default function SetupAdminPage() {
  redirect("/setup");
}
```

```tsx
// src/app/page.tsx
import { getSetupRedirect } from "@/lib/setupRoutes";

const status = await getSetupStatus();
const setupRedirect = getSetupRedirect(status);
if (setupRedirect) {
  redirect(setupRedirect);
}
```

```tsx
// src/app/login/page.tsx and src/app/register/page.tsx
import { getSetupRedirect } from "@/lib/setupRoutes";

const target = getSetupRedirect(data.status);
if (target) {
  router.replace(target);
}
```

```css
/* src/app/globals.css */
.setup-panel {
  grid-template-columns: 1.05fr 0.95fr;
}

.setup-steps {
  display: grid;
  gap: 10px;
  font-weight: 600;
}

.setup-step {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.35);
  padding: 10px 12px;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(11, 24, 54, 0.2);
}

.setup-note {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
}

.setup-field {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

.setup-success {
  display: grid;
  gap: 16px;
}

.setup-success-list {
  display: grid;
  gap: 6px;
  padding: 12px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
}
```

**Step 5: Run tests**

Run: `npx vitest run src/lib/__tests__/setup-routes.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/setupRoutes.ts src/lib/__tests__/setup-routes.test.ts src/app/page.tsx src/app/login/page.tsx src/app/register/page.tsx src/app/setup/page.tsx src/app/setup/admin/page.tsx src/app/globals.css
git commit -m "feat: wire setup wizard flow"
```

---

## Manual Verification
- Start the app with empty `/data/config.json` and no users.
- Visit `/` and confirm redirect to `/setup`.
- Enter DATABASE_URL + admin credentials; confirm success screen.
- Click "Войти" and confirm login screen renders.
- Repeat with existing `config.json` and zero users; wizard should skip DATABASE_URL field.
- If DB is down, `/setup` should show "Database unavailable".

