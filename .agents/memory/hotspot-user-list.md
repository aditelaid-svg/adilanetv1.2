---
name: Hotspot user list (Mikhmon-style)
description: Two distinct MikroTik user reads in this app — live sessions vs full configured user list — and which endpoint/UI each maps to.
---

# Hotspot user reads — two different things

There are TWO separate concepts, do not conflate:

1. **Active/live sessions** — `/ip/hotspot/active/print` via `getActiveUsers()` →
   `GET /api/routers/:id/active-users`. Only users currently online. Used for the
   connected-user count / router sync.
2. **Full configured user list (Mikhmon "Users" page)** — `/ip/hotspot/user/print`
   via `getHotspotUsers()` → `GET /api/routers/:id/hotspot-users` → AppContext
   `getRouterHotspotUsers` → page `AdminHotspotUsers` (`/admin/hotspot-users`).
   Includes OFFLINE users too. It merges the active list in (by username) so each
   row gets an `online` flag + MAC + address; totals (uptime/bytesIn/bytesOut) come
   from the user table so they persist after disconnect. Sorted online-first.

**Why no demo fallback:** unlike `getProfiles` (which has a demo fallback), the user
list never returns fake data — an offline router yields a 502 so the admin isn't
misled by invented users.

**UI note:** admin layout is `max-w-md` (mobile), so this is a card list, not a wide
table — that is the intended "rapih" answer to the Mikhmon cramped-columns request.
