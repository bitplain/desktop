# Desktop XP Shell Design

**Goal:** Rebuild the project as a clean, fast Windows XP desktop shell with modular apps, a first-run setup wizard, and admin-only invite registration.

## Architecture
- **Framework:** Next.js App Router + NextAuth Credentials + Prisma/Postgres.
- **Desktop access:** XP desktop renders only after user authentication.
- **Setup flow:** Separate setup pages (non-desktop) for secrets, DB, and first admin user.
- **Modularity:** Modules live in `src/modules/<name>/module.ts` and are auto-discovered via a generated registry.
- **Config storage:** `/data/config.json` (volume) with `600` permissions; env and Docker secrets override file values.

## Setup & Auth Flow
1. If no config file exists: redirect to `/setup`.
2. Setup collects `NEXTAUTH_SECRET`, `KEYS_ENCRYPTION_SECRET`, and database choice (local docker or remote URL).
3. Setup runs Prisma migrations and creates the first user as `ADMIN`.
4. If config exists but no users: redirect to `/setup/admin` (first admin creation).
5. If user not logged in: redirect to `/login`.
6. If logged in: render XP desktop.

## Data Model
- `User`: `id`, `email`, `passwordHash`, `role`, `createdAt`.
- `Invite`: `id`, `codeHash`, `createdBy`, `createdAt`, `expiresAt` (12h), `usedAt`, `usedBy`.
- Optional `UserSettings` for future module preferences.

## Modules
- `module.ts` manifest defines windows, start menu entries, and desktop icons.
- `modules.json` (optional, on volume) allows enable/disable and overrides of labels/icons.
- Core apps (Notepad, Calculator, Clock, About, System, Account) are bundled as modules.

## Docker
- `docker-compose up --build` starts `web` + optional `db`.
- `web` always boots and serves setup if config is missing.
- Local DB uses compose `db` service; remote DB uses provided `DATABASE_URL`.

## UI
- XP theme preserved; setup uses XP-styled window without desktop backdrop.
- Desktop visuals centralized in `src/config/desktop.ts` for wallpaper, icons, sounds.
