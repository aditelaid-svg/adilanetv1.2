---
name: Promo/Banner feature
description: Admin-managed home/landing promo banners — schema, image handling, link targets, payload limits.
---

# Promo / Banner

Admin-managed banners shown on UserHome (and reserved for a future landing page). Replaces the old hardcoded "Anti Buffering"/"Hemat" banners.

- `promos` table: title, subtitle, color (theme token name), icon (lucide key), badge, image_url, link_type, link_value, button_text, active, start_date, end_date, sort_order, show_on. Seeded with 2 starter promos on empty DB.
- Endpoints: admin CRUD `/api/promos` (requireAdmin) + public `/api/promos/public?show_on=home|landing` (active + within schedule, `LIMIT 12`).
- Context: `promos` (public/active list) + `refreshPromos()`; loaded inside `refreshData`. AdminPromos fetches its own FULL list directly (incl. inactive) and calls `refreshPromos()` after mutations.
- Shared styling helper: `src/lib/promoStyles.tsx` (PROMO_ICON_MAP, PROMO_BG, `<PromoIcon>`). Color tokens MUST match `@theme` in index.css (iris/gold/brand/success/danger/grape — no cyan).

**Image upload = base64 data URL stored in DB** (no object storage / no Docker volume needed; persists with DB backup).
**Why:** Docker/Dockge deploy has no persistent uploads dir besides the postgres volume; few small banner images make inline base64 the simplest durable option.
**How to apply:** Client compresses to JPEG (max 1000px wide, q0.82) before upload. Server allowlist: `data:image/(jpeg|png|webp);base64,` or `http(s)://`; hard cap 1.5MB per image; global express.json limit is 3mb. If you raise image quality/size, bump the json limit in lockstep or saves silently fail.

**Link target deep-link:** `link_type='package'` navigates `'/user/buy'` with `state:{ packageId }` — UserBuy already reads `location.state?.packageId` to preselect. Don't drop the state or package promos stop deep-linking.
