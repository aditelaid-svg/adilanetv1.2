---
name: UI conventions
description: Shared design tokens, format helpers, and UI primitives — prefer these over inline duplicates.
---

# UI conventions (AdilaNet)

- **Design language = "Coastal Glass" (LIGHT theme).** The app was converted from its old dark theme to a light one across EVERY surface (auth, customer, admin, overlays). Light sky→aqua→teal gradient background + frosted white glassmorphism cards, slate-800/600/500 text, sky-500 + teal accents, 28/32px radii, iOS typography. Do NOT reintroduce dark surfaces (`bg-surface`, `bg-black`, `bg-slate-900` as a card bg, `text-white`/`border-white/x` on non-colored backgrounds). **Exception:** `p.image_url ? 'bg-slate-900'` placeholders and `bg-black/30 text-white` badges sit UNDER promo images for legibility — those are intentional and must stay.
- **Glass + background utilities** live in `src/index.css`: `.coastal-bg` + 3 `.coastal-glow .coastal-glow-1/2/3` children (animated gradient bg), and `.glass` / `.glass-strong` / `.glass-pill` / `.glass-nav`. Standalone pages with NO layout (Login, Register, PublicBuy) must render their own `<div className="coastal-bg fixed inset-0">` with the 3 glow children + content at `relative z-10`. Layout-wrapped pages get the bg from `UserLayout` / `AdminLayout`.
- **Solid sky/teal/rose buttons correctly use `text-white`** — that is white-on-color, not a leftover dark class; don't "fix" those.
- `src/pages/user/UserHome.tsx` is the gold-standard reference for the light treatment.

- **Color tokens** live in `@theme` in `src/index.css` (brand, brand-hover, brand-deep, success, danger, danger-deep, warning, gold, iris, grape, surface). Use token utilities (`bg-brand`, `text-success`, etc.) — do NOT introduce new `bg-[#hex]` arbitrary color utilities for the main palette. For inline `style={{ color }}`, use `var(--color-...)`.
- **Money + dates**: use `src/lib/format.ts` (`formatRupiah`, `formatDate`, `formatDateShort`, `formatTime`) instead of inline `toLocaleString('id-ID')` / `new Date().toLocaleDateString`. `formatRupiah` already prepends `Rp`.
- **Shared primitives**: `src/components/ui/EmptyState.tsx` (icon+title+description) and `src/components/ui/Skeleton.tsx` (`Skeleton`, `SkeletonCard`, `SkeletonList`).
- **Loading UX**: `AppContext.loading` drives an indeterminate top bar (CSS class `.loading-bar` + `@keyframes loading-bar` in index.css) rendered in `AdminLayout` and `UserLayout`. List pages also render `<SkeletonList>` gated by `loading && data.length === 0`.

**Why:** the codebase had duplicated hex colors and ad-hoc Rupiah/date formatting; centralizing keeps polish consistent and cheap to change.

**How to apply:** when adding any price/date display, list page, or empty/loading state, reach for these helpers first rather than re-implementing.

## Pre-existing type noise (not from UI work)
`npx tsc --noEmit` reports errors in `src/pages/admin/AdminSettings.tsx` (`import.meta.env`) and `vite.config.ts` (`server.allowedHosts: boolean`). These predate the UI polish and don't break the dev/build runtime — don't chase them when validating UI changes.

## Modals must use a portal (createPortal → document.body)
Every route page is wrapped by `AnimatedOutlet` (a motion.div with transform + `will-change: transform`), which establishes a CSS containing block. Any `position: fixed` modal rendered inside a page is re-rooted to that box instead of the viewport — it appears trapped near the top, the backdrop doesn't cover the full screen, and `items-end` bottom-sheets float mid-screen.
**Fix/convention:** wrap modal overlays in `createPortal(<AnimatePresence>…</AnimatePresence>, document.body)`.
**Why:** transformed / will-change / filter ancestors re-root `position: fixed`. Any NEW modal in this app must be portaled or it will be trapped.
