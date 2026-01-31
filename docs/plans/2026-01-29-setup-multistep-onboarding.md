# Setup Multistep Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single setup wizard with a multi-page onboarding flow that provisions the database with admin credentials, stores only app credentials, and fixes self‑signed SSL failures.

**Architecture:** Add four setup pages (`/setup/step-1..4`) with client-side sessionStorage for admin DB creds, plus two new API endpoints for admin DB check/provision. Generate a safe `DATABASE_URL` (including SSL params) on provision and persist only app config to `/data/config.json`.

**Tech Stack:** Next.js App Router, Prisma + pg, Vitest, sessionStorage, server API routes.

---

### Task 0: Root-cause verification for self-signed errors

**Files:**
- Inspect: `src/lib/databaseReady.ts`
- Inspect: `src/lib/db-ssl.ts`
- Inspect: `src/lib/runtimeConfig.ts`

**Step 1: Reproduce the error**

Run: `npm run start`
Expected: `DEPTH_ZERO_SELF_SIGNED_CERT` in startup logs.

**Step 2: Trace the data flow**

Run: `rg -n "DATABASE_URL|sslmode|sslaccept|databaseReady" src`
Expected: find where `DATABASE_URL` is used by migrations and Prisma.

**Step 3: Confirm hypothesis**

Verify: `prisma migrate` uses `DATABASE_URL` directly (no `rejectUnauthorized`), so `sslmode=require` + self-signed cert fails.

---

### Task 1: Update setup routing to new step entry

**Files:**
- Modify: `src/lib/setupRoutes.ts`
- Test: `src/lib/__tests__/setup-routes.test.ts`

**Step 1: Write the failing test**

```ts
expect(getSetupRedirect("needsSetup")).toBe("/setup/step-1");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/setup-routes.test.ts`
Expected: FAIL with old `/setup` redirect.

**Step 3: Write minimal implementation**

```ts
return "/setup/step-1";
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/setup-routes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/setupRoutes.ts src/lib/__tests__/setup-routes.test.ts
git commit -m "feat: redirect setup flow to step-1"
```

---

### Task 2: Create setup page shell and step-1 welcome

**Files:**
- Create: `src/app/setup/step-1/page.tsx`
- Create: `src/app/setup/SetupShell.tsx`
- Modify: `src/app/setup/SetupWizard.tsx` (extract styles or remove if obsolete)
- Test: `src/app/setup/__tests__/setup-shell.test.tsx`

**Step 1: Write the failing test**

```tsx
const html = renderToString(<SetupShell title="Welcome" />);
expect(html).toContain("Welcome");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/setup/__tests__/setup-shell.test.tsx`
Expected: FAIL (file missing)

**Step 3: Write minimal implementation**

```tsx
export function SetupShell({ title, children }) {
  return <main className="auth-shell"><div className="auth-card">{title}{children}</div></main>;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/setup/__tests__/setup-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/step-1/page.tsx src/app/setup/SetupShell.tsx src/app/setup/__tests__/setup-shell.test.tsx
git commit -m "feat: add setup shell and welcome step"
```

---

### Task 3: Client storage for admin DB credentials (sessionStorage)

**Files:**
- Create: `src/lib/setupSession.ts`
- Test: `src/lib/__tests__/setup-session.test.ts`

**Step 1: Write the failing test**

```ts
saveAdminDb({ host:"h", port:"5432", user:"u", password:"p", ssl:true });
expect(loadAdminDb()).toEqual({ host:"h", port:"5432", user:"u", password:"p", ssl:true });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/setup-session.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
const KEY = "setup.adminDb";
export function saveAdminDb(value) { sessionStorage.setItem(KEY, JSON.stringify(value)); }
export function loadAdminDb() { /* parse or return null */ }
export function clearAdminDb() { sessionStorage.removeItem(KEY); }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/setup-session.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/setupSession.ts src/lib/__tests__/setup-session.test.ts
git commit -m "feat: store admin db session data"
```

---

### Task 4: Step-2 Admin DB form + API check endpoint

**Files:**
- Create: `src/app/setup/step-2/page.tsx`
- Create: `src/app/api/setup/admin/check/route.ts`
- Create: `src/lib/adminConnection.ts`
- Test: `src/lib/__tests__/admin-connection.test.ts`

**Step 1: Write the failing test**

```ts
await expect(checkAdminConnection(input)).resolves.toBe(true);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/admin-connection.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
export async function checkAdminConnection({ host, port, user, password, ssl }) {
  const client = new Client({ connectionString, ssl: ssl ? { rejectUnauthorized:false } : undefined });
  await client.connect(); await client.end(); return true;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/admin-connection.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/step-2/page.tsx src/app/api/setup/admin/check/route.ts src/lib/adminConnection.ts src/lib/__tests__/admin-connection.test.ts
git commit -m "feat: add admin db check step"
```

---

### Task 5: Step-3 App DB provision + config save

**Files:**
- Create: `src/app/setup/step-3/page.tsx`
- Create: `src/app/api/setup/admin/provision/route.ts`
- Modify: `src/lib/adminRepair.ts` (accept admin creds + app creds)
- Modify: `src/lib/runtimeConfig.ts` (save app config only)
- Create: `src/lib/dbUrlBuilder.ts`
- Test: `src/lib/__tests__/db-url-builder.test.ts`
- Test: `src/lib/__tests__/admin-repair.test.ts` (extend)

**Step 1: Write the failing test**

```ts
expect(buildDatabaseUrl({ host, port, user, password, db, ssl:true }))
  .toContain("sslmode=require");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/db-url-builder.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
export function buildDatabaseUrl(input) {
  const url = new URL(`postgresql://${user}:${pass}@${host}:${port}/${db}`);
  if (ssl) {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("sslaccept", "accept_invalid_certs");
    url.searchParams.set("uselibpqcompat", "true");
  }
  return url.toString();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/db-url-builder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/dbUrlBuilder.ts src/lib/__tests__/db-url-builder.test.ts
git commit -m "feat: build database url with ssl params"
```

---

### Task 6: Step-4 App admin creation flow

**Files:**
- Create: `src/app/setup/step-4/page.tsx`
- Modify: `src/app/api/setup/complete/handler.ts`
- Test: `src/app/api/setup/complete/handler.test.ts`

**Step 1: Write the failing test**

```ts
expect(result.status).toBe(200);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/setup/complete/handler.test.ts`
Expected: FAIL (new flow not wired)

**Step 3: Write minimal implementation**

```ts
// call existing completeSetup after config exists
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/setup/complete/handler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/step-4/page.tsx src/app/api/setup/complete/handler.ts src/app/api/setup/complete/handler.test.ts
git commit -m "feat: add setup admin step"
```

---

### Task 7: Styling unification for all setup inputs

**Files:**
- Modify: `src/app/setup/SetupShell.tsx`
- Modify: `src/app/setup/step-2/page.tsx`
- Modify: `src/app/setup/step-3/page.tsx`
- Modify: `src/app/setup/step-4/page.tsx`
- Modify: `src/components/ui/eco.tsx` (if needed)

**Step 1: Write the failing test**

```tsx
expect(html).toContain('data-eco="form"');
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/setup/__tests__/setup-shell.test.tsx`
Expected: FAIL if new class missing

**Step 3: Write minimal implementation**

```tsx
// ensure all inputs use EcoInput and shared CSS classes
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/setup/__tests__/setup-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/setup/SetupShell.tsx src/app/setup/step-2/page.tsx src/app/setup/step-3/page.tsx src/app/setup/step-4/page.tsx
git commit -m "style: unify setup form inputs"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Manual smoke**

Run: `npm run dev`
Expected: redirect to `/setup/step-1`, follow flow, no self-signed crash.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: finalize setup onboarding flow"
```

