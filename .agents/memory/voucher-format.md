---
name: Configurable voucher code format
description: How voucher code format is configured by admin and generated server-side.
---

# Voucher code format (admin-configurable)

Admin sets format from the Settings page; stored in the `settings` DB table as keys: `voucherCharset` (`alphanumeric`|`numeric`|`alpha`), `voucherLength`, `voucherPrefix`.

- `generateUniqueVoucher()` (server.ts) reads these via `getSettings()`, builds the code with `crypto.randomInt` over the chosen charset, clamps length to 4..20, defaults to `alphanumeric`/`8`/`WFI-` when a key is missing, and retries (up to 50) until unique in `transactions.voucher_code`.
- Defaults are also ensured on every boot via an idempotent `INSERT ... ON CONFLICT (config_key) DO NOTHING` — needed because the bulk seed only runs on an empty settings table, so pre-existing DBs would otherwise lack the keys.
- POST /api/settings validates: charset allowlisted, length clamped 4..20, prefix uppercased + stripped to `[A-Z0-9-]` max 10 (empty allowed).

**Mode is intentionally username = password** — the same code is used for both Mikrotik username and password (user declined separate user/pass).

**Why:** small keyspaces (e.g. numeric + length 4 = 10k combos) raise collision odds as vouchers accumulate; hence the higher retry count. Keep the client preview in AdminSettings.tsx in sync with the server's charset rules.
