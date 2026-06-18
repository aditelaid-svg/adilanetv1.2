---
name: Mikrotik profile management
description: How hotspot profile CRUD from the admin UI works (read fallback vs. write-through).
---

- Admins manage MikroTik hotspot user-profiles from the UI (AdminRouters "Kelola Profil" modal) without Winbox.
- Backend: `createProfile/updateProfile/deleteProfile` in `src/server/mikrotik.ts`; routes `GET/POST/PUT/DELETE /api/routers/:id/profiles` (all `requireAdmin`).
- **Read vs. write rule:** GET falls back to demo profiles (`source:"demo"`) when the router is unreachable; writes (POST/PUT/DELETE) NEVER fall back — they hit the real router and return 500 on failure.
  - **Why:** silent demo fallback on writes would make admins think a profile was created on the router when it wasn't.
- UI disables add/edit/delete when `source !== 'mikrotik'` (offline/demo), so writes are only attempted against a live router.
- Server validates profile fields before RouterOS calls (`validateProfileInput` in server.ts): name `^[\w .\-]{1,64}$`, sharedUsers `\d{1,4}`, rateLimit/sessionTimeout length + no control chars; profileId also length/control-char checked on PUT/DELETE.
- Edit form leaves Session Timeout blank by default = "leave unchanged" (RouterOS `/set` only updates provided params); placeholder reflects this.
