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
