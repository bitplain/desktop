# Ambitious Desktop Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship an ambitious, stable shell with encrypted runtime config, CSRF + rate limiting, and a lazy-loaded modular architecture with UX/perf upgrades.

**Architecture:** Split module metadata from window implementations, generate a registry with dynamic loaders, and update DesktopShell to lazy-load windows with prefetch. Harden auth-related endpoints with CSRF + rate limits and encrypt runtime config at rest.

**Tech Stack:** Next.js App Router, NextAuth Credentials, Prisma/Postgres, React 19, Vitest.

---

### Task 1: Add encrypted config helpers

**Files:**
- Create: `src/lib/configCrypto.ts`
- Test: `src/lib/__tests__/config-crypto.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { decryptConfigPayload, encryptConfigPayload } from "../configCrypto";

describe("config encryption", () => {
  it("round-trips payload", () => {
    const key = "test-key-1234567890";
    const payload = { databaseUrl: "postgres://x", nextAuthSecret: "a", keysEncryptionSecret: "b" };
    const encrypted = encryptConfigPayload(payload, key);
    const decrypted = decryptConfigPayload(encrypted, key);
    expect(decrypted).toEqual(payload);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/config-crypto.test.ts`
Expected: FAIL with "configCrypto module not found".

**Step 3: Write minimal implementation**

```ts
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";

const VERSION = 1;
const ALGO = "aes-256-gcm";

export type EncryptedConfigPayload = {
  version: 1;
  algorithm: "aes-256-gcm";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptConfigPayload(payload: unknown, key: string): EncryptedConfigPayload {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const derived = scryptSync(key, salt, 32);
  const cipher = createCipheriv(ALGO, derived, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: VERSION,
    algorithm: ALGO,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptConfigPayload(encrypted: EncryptedConfigPayload, key: string) {
  const salt = Buffer.from(encrypted.salt, "base64");
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  const derived = scryptSync(key, salt, 32);
  const decipher = createDecipheriv(ALGO, derived, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf-8")) as unknown;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/config-crypto.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/configCrypto.ts src/lib/__tests__/config-crypto.test.ts
git commit -m "feat: add encrypted config helpers"
```

---

### Task 2: Wire encrypted config into runtime config + setup

**Files:**
- Modify: `src/lib/runtimeConfig.ts`
- Modify: `src/lib/setupCompletion.ts`
- Modify: `src/app/api/setup/config/route.ts`
- Modify: `src/app/setup/SetupWizard.tsx`
- Test: `src/lib/__tests__/runtime-config.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect, vi } from "vitest";
import { encryptConfigPayload } from "../configCrypto";
import { loadRuntimeConfig } from "../runtimeConfig";

describe("runtime config encrypted", () => {
  it("rejects missing CONFIG_ENCRYPTION_KEY", () => {
    vi.stubEnv("CONFIG_ENCRYPTION_KEY", "");
    expect(loadRuntimeConfig({ mockConfig: null })).toBeNull();
  });

  it("loads encrypted config payload", () => {
    vi.stubEnv("CONFIG_ENCRYPTION_KEY", "test-key-1234567890");
    const payload = {
      databaseUrl: "postgres://x",
      nextAuthSecret: "a",
      keysEncryptionSecret: "b",
    };
    const encrypted = encryptConfigPayload(payload, "test-key-1234567890");
    const result = loadRuntimeConfig({ mockConfig: encrypted as unknown as any });
    expect(result).toEqual(payload);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/runtime-config.test.ts`
Expected: FAIL (loadRuntimeConfig does not handle encrypted payload).

**Step 3: Implement**

Update `runtimeConfig.ts` to:
- Detect `EncryptedConfigPayload` shape.
- Read `CONFIG_ENCRYPTION_KEY` from env.
- Decrypt into `RuntimeConfig`.
- Return `null` if missing key.

Update setup routes to:
- Require `CONFIG_ENCRYPTION_KEY` env.
- Write encrypted config file instead of plaintext.
- Show a clear error in `SetupWizard` if env is missing.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/runtime-config.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/runtimeConfig.ts src/lib/setupCompletion.ts src/app/api/setup/config/route.ts src/app/setup/SetupWizard.tsx src/lib/__tests__/runtime-config.test.ts
git commit -m "feat: encrypt runtime config storage"
```

---

### Task 3: Add rate limiting model + library

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/rateLimit.ts`
- Test: `src/lib/__tests__/rate-limit.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { consumeRateLimit } from "../rateLimit";

describe("rate limit", () => {
  it("blocks after limit reached", async () => {
    const key = "login|127.0.0.1|user@example.com";
    for (let i = 0; i < 5; i += 1) {
      await consumeRateLimit(key, { limit: 5, windowMs: 1000 });
    }
    const result = await consumeRateLimit(key, { limit: 5, windowMs: 1000 });
    expect(result.allowed).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/rate-limit.test.ts`
Expected: FAIL (rateLimit module missing).

**Step 3: Implement**

Add Prisma model:
```prisma
model RateLimitBucket {
  key       String   @id
  hits      Int
  resetAt   DateTime
  updatedAt DateTime @updatedAt
}
```

Create `consumeRateLimit` that:
- Upserts bucket by key.
- Resets on window expiry.
- Increments hits and returns `{ allowed, remaining, resetAt }`.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/rate-limit.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/rateLimit.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat: add rate limiting buckets"
```

---

### Task 4: Apply rate limiting to auth + setup APIs

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/invites/route.ts`
- Modify: `src/app/api/account/password/route.ts`
- Modify: `src/app/api/setup/complete/route.ts`
- Modify: `src/app/api/setup/config/route.ts`
- Test: `src/app/__tests__/rate-limit-api.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { POST as register } from "@/app/api/register/route";

describe("register rate limit", () => {
  it("returns 429 after limit", async () => {
    const req = new Request("http://localhost/api/register", { method: "POST", body: JSON.stringify({ email: "a@b.com", password: "pass", inviteCode: "x" }) });
    // call enough times to exceed limit
    for (let i = 0; i < 6; i += 1) {
      await register(req);
    }
    const response = await register(req);
    expect(response.status).toBe(429);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/__tests__/rate-limit-api.test.ts`
Expected: FAIL (rate limiter not applied).

**Step 3: Implement**

Apply `consumeRateLimit`:
- Use `x-forwarded-for` or `request.headers.get("x-forwarded-for")` fallback.
- Build keys per route type.
- For `/api/auth` login (Credentials `authorize`), call rate limit before password compare.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/__tests__/rate-limit-api.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/register/route.ts src/app/api/invites/route.ts src/app/api/account/password/route.ts src/app/api/setup/complete/route.ts src/app/api/setup/config/route.ts src/app/__tests__/rate-limit-api.test.ts
git commit -m "feat: apply rate limiting to auth routes"
```

---

### Task 5: Add CSRF helpers + middleware cookie

**Files:**
- Create: `src/lib/csrf.ts`
- Modify: `middleware.ts`
- Modify: `src/lib/http.ts`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/invites/route.ts`
- Modify: `src/app/api/account/password/route.ts`
- Modify: `src/app/api/setup/complete/route.ts`
- Modify: `src/app/api/setup/config/route.ts`
- Test: `src/lib/__tests__/csrf.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { validateCsrf } from "../csrf";

describe("csrf", () => {
  it("accepts matching cookie + header", () => {
    const result = validateCsrf("token", "token");
    expect(result.ok).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/csrf.test.ts`
Expected: FAIL (csrf module missing).

**Step 3: Implement**

`validateCsrf(cookie, header)`:
- Return ok if both exist and match; else `{ ok: false, error: "CSRF token missing" }`.

Middleware:
- If request is not `/api`, set `csrf-token` cookie when missing.

`postJson`:
- Read `csrf-token` from `document.cookie` and send `x-csrf-token`.

API handlers:
- For POST routes (except `/api/auth/*`), validate `csrf-token` cookie + header.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/csrf.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/csrf.ts middleware.ts src/lib/http.ts src/app/api/register/route.ts src/app/api/invites/route.ts src/app/api/account/password/route.ts src/app/api/setup/complete/route.ts src/app/api/setup/config/route.ts src/lib/__tests__/csrf.test.ts
git commit -m "feat: add csrf protection"
```

---

### Task 6: Create module registry types + generator output

**Files:**
- Modify: `src/modules/types.ts`
- Modify: `scripts/generate-modules-registry.mjs`
- Test: `src/modules/__tests__/registry.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { modulesMeta, moduleLoaders } from "@/modules/registry";

describe("module registry", () => {
  it("exports meta + loaders", () => {
    expect(Array.isArray(modulesMeta)).toBe(true);
    expect(typeof moduleLoaders).toBe("object");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/modules/__tests__/registry.test.ts`
Expected: FAIL (exports missing).

**Step 3: Implement**

`ModuleManifest`:
- Remove `Window` from manifest type.
Add:
```ts
export type ModuleManifest = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  desktopIcon?: boolean;
  startMenu?: boolean;
  defaultOpen?: boolean;
  order?: number;
};

export type ModuleLoader = () => Promise<{ default: ComponentType<{ userEmail?: string | null }> }>;
```

Generator output:
- `modulesMeta = [manifest0, ...]`
- `moduleLoaders = { [manifest0.id]: () => import("./core/.../window") }`

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/modules/__tests__/registry.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/types.ts scripts/generate-modules-registry.mjs src/modules/__tests__/registry.test.ts
git commit -m "feat: split module meta and loader registry"
```

---

### Task 7: Migrate core modules to manifest + window

**Files:**
- Create: `src/modules/core/*/manifest.ts`
- Create: `src/modules/core/*/window.tsx`
- Delete: `src/modules/core/*/module.tsx`
- Modify: `src/modules/registry.ts` (generated)

**Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { modulesMeta, moduleLoaders } from "@/modules/registry";

describe("core modules", () => {
  it("includes notepad loader", async () => {
    const loader = moduleLoaders["notepad"];
    const mod = await loader();
    expect(typeof mod.default).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/__tests__/registry.test.ts`
Expected: FAIL (loader missing).

**Step 3: Implement**

For each module:
- `manifest.ts` exports default `ModuleManifest`.
- `window.tsx` default exports component (client component where needed).

Run generator:
- `node scripts/generate-modules-registry.mjs`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/__tests__/registry.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/core src/modules/registry.ts
git commit -m "feat: migrate core modules to manifest/window"
```

---

### Task 8: Update DesktopShell to lazy-load windows + prefetch

**Files:**
- Modify: `src/components/desktop/DesktopClient.tsx`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/components/desktop/DesktopIcons.tsx`
- Modify: `src/components/desktop/StartMenu.tsx`
- Create: `src/components/desktop/WindowLoading.tsx`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DesktopClient from "@/components/desktop/DesktopClient";

describe("DesktopClient", () => {
  it("renders module metadata without loading windows", () => {
    const { getByText } = render(<DesktopClient userEmail={null} />);
    expect(getByText("Notepad")).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/desktop/__tests__/desktop-client.test.tsx`
Expected: FAIL (new behavior not implemented).

**Step 3: Implement**

DesktopClient:
- Use `modulesMeta` + `moduleLoaders`.

DesktopShell:
- Build `windowConfigs` using `next/dynamic`:
```tsx
const WindowComponent = useMemo(
  () => dynamic(moduleLoaders[module.id], { loading: () => <WindowLoading /> }),
  [module.id]
);
```
- Call loader on hover in icons/menu to prefetch.

DesktopIcons/StartMenu:
- Add `onHoverPrefetch` callbacks.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/desktop/__tests__/desktop-client.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/DesktopClient.tsx src/components/desktop/DesktopShell.tsx src/components/desktop/DesktopIcons.tsx src/components/desktop/StartMenu.tsx src/components/desktop/WindowLoading.tsx
git commit -m "feat: lazy-load module windows with prefetch"
```

---

### Task 9: Desktop icon ordering + grouping + virtualization

**Files:**
- Create: `src/lib/iconLayout.ts`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/components/desktop/DesktopIcons.tsx`
- Test: `src/lib/__tests__/icon-layout.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { sortIconsByLabel } from "../iconLayout";

describe("icon layout", () => {
  it("sorts icons by label", () => {
    const icons = [{ id: "b", label: "B" }, { id: "a", label: "A" }];
    const sorted = sortIconsByLabel(icons);
    expect(sorted[0].id).toBe("a");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/icon-layout.test.ts`
Expected: FAIL (iconLayout missing).

**Step 3: Implement**

`iconLayout.ts`:
- `sortIconsByLabel`
- `groupIconsByCategory`
- `computeVirtualRows(viewHeight, iconHeight, icons)`

`DesktopIcons`:
- Render only visible rows based on scroll position.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/icon-layout.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/iconLayout.ts src/components/desktop/DesktopShell.tsx src/components/desktop/DesktopIcons.tsx src/lib/__tests__/icon-layout.test.ts
git commit -m "feat: add icon ordering and virtualization"
```

---

### Task 10: Optimize window layout persistence

**Files:**
- Modify: `src/lib/windowLayouts.ts`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Test: `src/lib/__tests__/window-layouts.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { shouldPersistLayout } from "../windowLayouts";

describe("window layout", () => {
  it("skips save when layout unchanged", () => {
    const result = shouldPersistLayout([{ id: "a", zIndex: 1, isOpen: true, isMinimized: false, position: { x: 0, y: 0 } }], [{ id: "a", zIndex: 1, isOpen: true, isMinimized: false, position: { x: 0, y: 0 } }]);
    expect(result).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/window-layouts.test.ts`
Expected: FAIL (helper missing).

**Step 3: Implement**

`windowLayouts.ts`:
- Add `shouldPersistLayout(prev, next)` to avoid redundant writes.
- Add `saveWindowLayoutIdle` that uses `requestIdleCallback` fallback to `setTimeout`.

`DesktopShell`:
- Use `saveWindowLayoutIdle` in effect.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/window-layouts.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/windowLayouts.ts src/components/desktop/DesktopShell.tsx src/lib/__tests__/window-layouts.test.ts
git commit -m "feat: optimize window layout persistence"
```

---

### Task 11: Update documentation

**Files:**
- Modify: `README.md`

**Step 1: Write failing test (docs lint not available)**

Skip tests. Document new env var `CONFIG_ENCRYPTION_KEY` and module structure.

**Step 2: Update README**

Add:
- `CONFIG_ENCRYPTION_KEY` requirement.
- Module folder structure and loader behavior.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update runtime config and modules guide"
```

---

Plan complete and saved to `docs/plans/2026-01-17-ambitious-shell-implementation-plan.md`.
Two execution options:

1. Subagent-Driven (this session) - I dispatch a fresh subagent per task and review between tasks.
2. Parallel Session (separate) - Open a new session using superpowers:executing-plans and run task-by-task with checkpoints.

Which approach?
