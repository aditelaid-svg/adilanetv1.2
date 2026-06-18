---
name: Docker / Dockge deployment
description: How the app is meant to be self-hosted via Docker Compose (Dockge), and the gotchas.
---

# Self-hosting via Dockge / Docker Compose

- `docker-compose.yml` defines two services: `db` (postgres:16-alpine, data in `db_data` volume) and `app` (built from a GitHub repo via `build.context: <git url>`). Multi-stage `Dockerfile` runs `npm run build` (vite build + esbuild bundle to `dist/server.cjs`) then `node dist/server.cjs`.
- **`SESSION_SECRET` is mandatory** — the server throws on startup if it is missing/empty. It must be set in the compose `environment` block, NOT only in `.env.example`.
- **DB tables auto-create** on boot via `initDb()` (`CREATE TABLE IF NOT EXISTS` + seed, including a default superadmin). No manual SQL import needed.
- **Sanpay credentials are NOT env vars** — they are entered at runtime in the admin Settings page (stored in the `settings` table). Do not add `SANPAY_*` to compose; it's misleading.
- In production the Express server serves the built frontend from `dist/` (static + SPA fallback); the vite dev middleware is only used when `NODE_ENV !== 'production'`.
- **Updating**: because the image is built from a GitHub context (not a registry), Watchtower does NOT work. Update by re-deploying the stack in Dockge (pulls latest, rebuilds).

**Why:** these are deployment-time facts not visible from the app code at a glance; getting `SESSION_SECRET` or the Sanpay-via-UI detail wrong causes a crash-loop or confusion.
