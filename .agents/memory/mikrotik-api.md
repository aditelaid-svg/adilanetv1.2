---
name: Mikrotik API
description: RouterOS API communication via routeros-api npm package
---

Key fixes applied to src/server/mikrotik.ts:

1. Port must be explicitly passed: `port: config.port ? parseInt(String(config.port)) : 8728`
2. createVoucher uses STRING ARRAY format (not object): `[=name=${name}, =password=${password}, =profile=${profile}]`
3. Profiles fetched via `/ip/hotspot/user/profile/print` — returns array of objects with `.id`, `name`, `session-timeout`, `shared-users`, `rate-limit` keys
4. Both getProfiles and createVoucher wrap `api.close()` in try/catch to prevent errors on close

Server-side: profiles endpoint passes `port: router.api_port` to getProfiles
Fallback: if router unreachable after 4s timeout → returns demo profiles with source:"demo"

**Why:** routeros-api v1.x createVoucher fails with object params; needs string array format.

## Live online/active users
- `getActiveUsers()` reads `/ip/hotspot/active/print` (one row = one connected device): user, address, mac-address, uptime, bytes-in/out, login-by.
- Endpoints: `GET /api/routers/:id/active-users` (live list) and `POST /api/routers/:id/sync` (count only) — both requireAdmin, 4s timeout race, set router status online/offline, sync `connected_users` to the REAL count.
- **No fake fallback here** (unlike profiles' demo): on failure they return HTTP 502 with a clear error. The old `/sync` used to fabricate a random count — that was the placeholder behind the bogus "User Aktif" number; it's gone.
- `connected_users` is a stored counter; it only reflects reality after a sync/active-users call. It is NOT decremented on disconnect by anything else.
- Frontend: `AppContext.getRouterActiveUsers` + `ActiveUser` type; AdminRouters has a clickable "User Online" card → modal with live list + refresh.
