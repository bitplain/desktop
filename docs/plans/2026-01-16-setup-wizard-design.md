# Setup Wizard Design (XP UI)

## Goal
Deliver a first-run setup wizard that matches the existing XP-styled UI and completes all required setup in one flow: save config, run migrations, and create the first admin account.

## Non-goals
- Adding ETH-specific modules or behavior.
- Reworking existing desktop, login, or register flows beyond setup gating.
- Introducing a multi-tenant or multi-admin bootstrap flow.

## User Flow
1. User hits `/`.
2. Server checks `getSetupStatus()` and redirects to `/setup` if setup is incomplete.
3. Wizard collects `DATABASE_URL` and admin credentials.
4. Server generates secrets, writes config, runs migrations, creates admin.
5. Wizard shows "Setup complete" and a button to go to `/login`.

## UI/UX
- Full-screen layout reusing existing login UI classes:
  - `.login-screen`, `.login-panel`, `.login-hero`, `.login-form`.
  - `.xp-input`, `.xp-button`, `.notice` for form controls and errors.
- Left column: branding, brief steps, and reassurance copy.
- Right column: form fields and submit button.
- Success screen in the same panel with a short checklist and a "Log in" CTA.

## Server-Side API
Create a single setup endpoint:
- `POST /api/setup/complete`
  - Input: `{ databaseUrl, email, password }`.
  - Behavior:
    - Validate DB URL and credentials.
    - If config is missing, generate secrets and write `config.json` (mode 0600).
    - Set runtime env vars from config.
    - Run `prisma migrate deploy`.
    - Create first admin if no users exist; return 409 if admin already exists.
  - Output: `{ ok: true }` or `{ error: string }` with status code.

Existing endpoint retained:
- `GET /api/setup/status` for UI gating and redirects.

## Data Flow
- `setup/page.tsx` stays server-rendered to enforce redirects.
- `SetupWizard` (client) fetches setup status and submits setup completion.
- After success, UI displays a confirmation view and navigates to `/login` on click.

## Error Handling
- 400: invalid DB URL or password requirements not met.
- 409: setup already completed; offer "Log in" button.
- 500/503: migration or DB connectivity errors; show retry guidance.

## Testing
- Unit tests for setup validation remain in `src/lib/__tests__`.
- Add API tests for `/api/setup/complete`:
  - invalid payloads return 400.
  - existing admin returns 409.
  - successful run returns ok.
- Manual verification:
  - With empty config, wizard completes and enables login.
  - With existing config and no users, wizard creates admin.
  - With DB down, wizard shows error and does not advance.

## Open Questions
None.
