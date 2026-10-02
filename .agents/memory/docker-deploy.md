---
name: Docker / Dockge deployment
description: How the app is meant to be self-hosted via Docker Compose (Dockge), and the gotchas.
---

# Self-hosting via Dockge / Docker Compose

- `docker-compose.yml` defines two services: `db` (postgres:16-alpine, data in `db_data` volume) and `app` (built from a GitHub repo via `build.context: <git url>`). Multi-stage `Dockerfile` runs `npm run build` (vite build + esbuild bundle to `dist/server.cjs`) then `node dist/server.cjs`.
- **`SESSION_SECRET` is mandatory** — the server throws on startup if it is missing/empty. It must be set in the compose `environment` block, NOT only in `.env.example`.
- **DB tables auto-create** on boot via `initDb()` (`CREATE TABLE IF NOT EXISTS` + seed, including a default superadmin). No manual SQL import needed.
- In production the Express server serves the built frontend from `dist/` (static + SPA fallback); the vite dev middleware is only used when `NODE_ENV !== 'production'`.
- **Updating**: do not assume the live stack builds from GitHub. The user also deploys registry images; base update instructions on the actual Dockge compose configuration.

**Why:** these are deployment-time facts not visible from the app code at a glance; getting `SESSION_SECRET` wrong causes a crash-loop.

Self-hosted database upgrades must not depend on Replit-managed migrations or a manual SQL step. Initialize missing payment tables idempotently, retain existing financial data, and package required migration assets with the runtime.

**Why:** A Docker image update does not update a persistent external PostgreSQL schema automatically. Saving newly introduced gateway settings can fail before storing credentials if its tables are missing.

**How to apply:** Verify startup against both an existing schema and a runtime containing only production build assets. Do not reset database volumes to resolve a missing table.

ARM64 support is required: the user said their server is ARM64, usually an STB. Do not simplify a failing multi-platform build to AMD64 only.

**Why:** An AMD64-only image cannot run natively on the user's deployment hardware. QEMU crashed during the ARM64 dependency installation while the AMD64 application build succeeded.

**How to apply:** Preserve ARM64 when modifying deployment or CI. Prefer native ARM64 builds for Node dependencies rather than assuming a successful AMD64 build validates the STB image.
