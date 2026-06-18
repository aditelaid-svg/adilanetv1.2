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

## Voucher purchase → Mikrotik provisioning
- Buying a package provisions a real hotspot user on the package's router using its Mikrotik profile (the profile is the source of truth for duration via session-timeout + speed/quota via rate-limit; voucher code is used as both username and password).
  - **Why:** a code not actually created on Mikrotik is worthless. If the package has no router/profile or the router is unreachable, the purchase FAILS loudly (no silent demo fallback) so dead vouchers are never sold.
- Saldo purchases deduct balance before provisioning and **refund** if provisioning fails.
- Payment-confirmation webhook is idempotent: it atomically claims the payment `reference_id` (unique) with a `pending` row whose `voucher_code` stays NULL until the hotspot user is actually created; the code is only written/exposed on success, and a failed attempt releases the claim so retries work. `reference_id` is mandatory for Success/PAID callbacks.
  - **Why:** real gateways deliver callbacks concurrently/with retries; an atomic claim is the only way to guarantee one payment → one Mikrotik user.
- User-app QRIS confirmation must use the voucher code returned by the webhook itself — do NOT also create a second transaction for the same purchase.
- **Known gap (needs user decision):** payment is simulated (create-qris is a mock; public buy + webhook trust client-sent success). Until a real payment gateway is integrated there is no real payment verification, so the API can be called to mint vouchers. Flagged to user as separate scope.
