---
name: Admin bulk voucher generation
description: How admin "Generate Voucher" (AdminVouchers) mass-creates real vouchers on MikroTik, and why it is stateless (no DB).
---

# Admin bulk voucher generation

AdminVouchers page (`src/pages/admin/AdminVouchers.tsx`) was originally FAKE —
generated random codes client-side with setTimeout, never touched the router or DB.
Now it POSTs to `POST /api/router/create-vouchers-bulk` (requireAdmin) which really
provisions the codes on MikroTik.

- Server: `genBulkCode(format)` (6-char, alphanumeric or numeric) + endpoint that
  validates quantity 1..200, generates unique codes deduped within the batch (Set +
  guard loop `guard < qty*50`), comment = `buildVoucherIdentity({admin:true})`.
- MikroTik: `createVouchersBulk(config, profile, vouchers[])` in
  `src/server/mikrotik.ts` — ONE RouterOS connection, per-voucher try/catch so a
  single duplicate-username failure does not abort the batch (returns `created[]` +
  `failed[]`), runs `ensureValidityEnforcement` ONCE at the end. Throws only on
  connection-level failure.

**Why stateless (no `vouchers` table):** matches the pre-existing single admin
endpoint `/api/router/create-voucher`, which is also push-to-router-only. MikroTik
itself enforces unique hotspot usernames, so duplicates surface as per-voucher
`failed` entries rather than corrupting anything.

**Known trade-off:** `generateUniqueVoucher()` (customer purchase flow) only checks
`transactions.voucher_code`, so it is blind to admin bulk codes → small chance of a
random collision when a purchase later provisions to MikroTik. Not a financial-
integrity risk (purchase flow has balance/refund rollback), just a possible
provisioning retry. To eliminate it, introduce a shared `vouchers` registry and make
both generators check it.
