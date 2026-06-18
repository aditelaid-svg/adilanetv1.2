---
name: WiFi one-tap login after purchase
description: How registered app users auto-login to the Mikrotik hotspot after buying a voucher
---

After a registered user buys a voucher with saldo while already connected to the WiFi, they can one-tap login to the hotspot — no manual code entry.

- Driven by an admin-configurable setting `hotspotLoginUrl` (the Mikrotik **gateway** hotspot login page, e.g. `http://10.5.50.1/login`). This is DISTINCT from a router's `ip_address` (which is the API host); do not conflate them.
- Settings plumbing mirrors the other keys: seeded in initDb (first-seed + idempotent backfill), validated in `POST /api/settings` (empty OR `^https?://[^\s]+$`, max 255), returned by `GET /api/settings` and the unauthenticated `GET /api/config/public`.
- UserBuy success screen: when `hotspotLoginUrl` is set, shows "Login WiFi Sekarang"; it builds a hidden POST form (`username`=`password`=voucher code, plus `dst`) and submits it as a **top-level navigation** to the hotspot URL. This is the correct captive-portal strategy — avoids CORS/XHR + mixed-content blocking that an fetch/XHR would hit. Empty URL → falls back to the old "Selesai" button.

**Why top-level form POST:** Mikrotik hotspot login accepts username/password form posts at the gateway; voucher code is both username & password. A fetch() would be blocked (cross-origin + https→http mixed content); a top-level form navigation is allowed.

**Known caveat:** if the app is served over HTTPS and the gateway login is HTTP, some browsers show an "insecure form" warning — expected for local gateway login, not a bug.
