---
name: Auth & session architecture
description: How login/session/authz works server-side and what the frontend must respect.
---

# Auth & session

- Session is **cookie-based** (express-session + connect-pg-simple, table `user_sessions` auto-created). The server is the source of truth; `/api/auth/me` hydrates the frontend on mount. `trust proxy` is on; cookie `secure` only in production.
- Passwords **and PINs** are bcrypt-hashed. On boot, `initDb` migrates any plaintext rows to bcrypt, made idempotent by `isBcryptHash()` — so re-running boot never double-hashes. Seed still inserts plaintext (`admin`/`user123`); they get hashed on first boot.
- Login identifier matches email **or** phone_number **or** name, then `bcrypt.compare`. Seed admin = `admin@wifivoucher.com` / `admin`; demo users `user@demo.com` / `user123`.

**Why:** plaintext credentials + no real sessions was the original insecure state; this was the production-hardening pass.

**How to apply:**
- Never return `password`/`pin` in any response or SELECT *; routers GET also omits `password`, and router PUT only overwrites password when a non-empty one is sent.
- `requireAuth` / `requireAdmin` guard routes; PATCH/GET users are self-or-admin. Regular users' transactions are session-scoped server-side — the frontend must NOT call `/api/users` or `/api/routers` for non-admins (they 403).
- Balance deduction on purchase is an atomic conditional UPDATE (`balance >= amount`) to prevent overdraft/races; user_id comes from the session, never the request body.
- Voucher codes use `generateUniqueVoucher()` (crypto + DB-uniqueness retry), not `Math.random`.
- `SESSION_SECRET` is required (server throws without it). Webhook verifies `SANPAY_WEBHOOK_SECRET` via `x-webhook-secret` header when that env var is set.
- `SECRET`/secret envs live as Replit secrets; `.env.example` documents SESSION_SECRET + SANPAY_WEBHOOK_SECRET.
