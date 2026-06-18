---
name: UI conventions
description: Shared design tokens, format helpers, and UI primitives — prefer these over inline duplicates.
---

# UI conventions (AdilaNet)

- **Color tokens** live in `@theme` in `src/index.css` (brand, brand-hover, brand-deep, success, danger, danger-deep, warning, gold, iris, grape, surface). Use token utilities (`bg-brand`, `text-success`, etc.) — do NOT introduce new `bg-[#hex]` arbitrary color utilities for the main palette. For inline `style={{ color }}`, use `var(--color-...)`.
- **Money + dates**: use `src/lib/format.ts` (`formatRupiah`, `formatDate`, `formatDateShort`, `formatTime`) instead of inline `toLocaleString('id-ID')` / `new Date().toLocaleDateString`. `formatRupiah` already prepends `Rp`.
- **Shared primitives**: `src/components/ui/EmptyState.tsx` (icon+title+description) and `src/components/ui/Skeleton.tsx` (`Skeleton`, `SkeletonCard`, `SkeletonList`).
- **Loading UX**: `AppContext.loading` drives an indeterminate top bar (CSS class `.loading-bar` + `@keyframes loading-bar` in index.css) rendered in `AdminLayout` and `UserLayout`. List pages also render `<SkeletonList>` gated by `loading && data.length === 0`.

**Why:** the codebase had duplicated hex colors and ad-hoc Rupiah/date formatting; centralizing keeps polish consistent and cheap to change.

**How to apply:** when adding any price/date display, list page, or empty/loading state, reach for these helpers first rather than re-implementing.

## Pre-existing type noise (not from UI work)
`npx tsc --noEmit` reports errors in `src/pages/admin/AdminSettings.tsx` (`import.meta.env`) and `vite.config.ts` (`server.allowedHosts: boolean`). These predate the UI polish and don't break the dev/build runtime — don't chase them when validating UI changes.
