# Desktop XP Shell Ambitious Plan (Design)

## Goal
Deliver a "fast, stable, extensible shell" by:
- Hardening security (encrypted runtime config, CSRF, rate limiting).
- Reworking module loading for performance and easy extensibility.
- Improving UX responsiveness and feedback without breaking the XP-style UI.

## Non-goals
- Remote plugin loading by URL.
- Major visual redesign away from the existing XP theme.
- Introducing new external services beyond Postgres.

## Current constraints
- Runtime config stored at `/data/config.json`.
- NextAuth Credentials + JWT session strategy.
- Module registry is a static array of component imports.

## Architecture: module system
### Approach
Split module definitions into:
- `manifest.ts`: static metadata only (id/title/icon/order/flags).
- `window.tsx`: module UI, loaded on demand.

Generate a registry that exports:
- `modulesMeta`: array of manifests (fast initial load).
- `moduleLoaders`: map of `id -> () => import(".../window")`.

### Runtime
- Desktop renders immediately from `modulesMeta`.
- Window components load via `next/dynamic` only when opened.
- Optional hover prefetch on icon/start menu items.
- Fallback loading UI shown inside the window chrome.

### Adding a module
Create a folder under `src/modules/...` with:
- `manifest.ts`
- `window.tsx`
The generator updates the registry automatically.

## Security hardening
### Encrypted config
Store encrypted payload in `config.json` using AES-256-GCM.
Inputs:
- `CONFIG_ENCRYPTION_KEY` from env.
- Key derived with `scrypt` and per-file `salt`.
Stored fields:
- `version`, `algorithm`, `salt`, `iv`, `tag`, `ciphertext`.

`loadRuntimeConfig`:
- Reads encrypted format and decrypts with env key.
- Rejects missing key.
- Handles legacy plaintext by requiring migration via setup flow.

### Rate limiting
Add Prisma model `RateLimitBucket` with:
- `key`, `hits`, `resetAt`, `updatedAt`.
Key format: `type|ip|email?`.
Apply to:
- `/api/register`
- `/api/setup/*`
- `/api/invites`
- `/api/account/password`
- NextAuth Credentials `authorize` flow.
Return 429 on limit.

### CSRF
Double-submit token for all state-changing `/api` routes.
- `csrf-token` cookie (SameSite=Lax, Secure in prod).
- `x-csrf-token` header.
Exclude `/api/auth/*` (NextAuth).

## Performance + UX
- Lazy load module windows; show XP-style loading state.
- Optional prefetch on hover for perceived speed.
- Virtualize desktop icons when count grows.
- Save window layout with debounce + `requestIdleCallback`.
- Memoize heavy components to avoid rerenders.
- Add explicit loading and error feedback for setup/login/register flows.

## Migration
1. Add new registry generator and migrate one core module first.
2. Update DesktopShell to use meta + dynamic window loading.
3. Add encrypted config read/write and migration guard.
4. Add CSRF + rate limit middleware.
5. Roll across all core modules.

## Testing
- Unit tests for: encryption helpers, rate limiter, CSRF validator.
- Integration tests for register/login flow with CSRF + rate limits.
- Smoke test for module lazy-loading (window renders after open).
