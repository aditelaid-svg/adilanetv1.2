---
name: SanPay QRIS payment flow
description: How real QRIS payment + webhook fulfillment works in the voucher app; the security invariants that must hold.
---

# SanPay QRIS integration (sanpay.site)

Real payment gateway. Admin enters credentials in the `settings` DB table (NOT env secrets, by design): `merchantId` (= SanPay Merchant Code), `sanpayApiKey`, `qrisEnabled` toggle. AdminSettings.tsx shows the callback URL to register in the SanPay dashboard.

## Flow
- `POST /api/payment/create-qris`: 403 if `qrisEnabled==='false'`, 503 if creds missing. Uses the package price as the authoritative amount (never trusts client amount). Inserts a `pending` transaction keyed by a unique `reference_id` (the partnerReferenceNo), then calls SanPay `POST /api/v1/topup_qris` with headers `X-Merchant-Code` + `X-Signature` = HMAC-SHA256(rawJSONbody, apiKey). Deletes the pending row on SanPay failure.
- `POST /api/webhook/sanpay`: SanPay calls this on successful payment. QRIS echoes our ref as `referenceNo`; VA/Retail use `partnerReferenceNo` + `payment_status='PAID'`.
- `GET /api/payment/status/:refId`: frontend (PublicBuy.tsx, UserBuy.tsx) polls every 4s; returns `voucher_code` only once `status==='success'`.

## Security invariants — do not regress
- **Signature**: HMAC-SHA256 of the *raw* request body (express.json `verify` captures `req.rawBody`) compared with `timingSafeEqual`, plus merchant-code header match. Only enforced when creds are configured, so SanPay's setup-time URL-validation ping still reaches us.
- **Idempotent atomic claim**: provisioning is gated by `UPDATE ... SET status='provisioning' WHERE reference_id=$1 AND status='pending' RETURNING ...`. 0 rows ⇒ acknowledge (no double-provision). `status` column is VARCHAR(20) because `'provisioning'` is 12 chars (VARCHAR(10) threw 22001).
- **Success-state gate**: reject if `body.status` present and !== 'success', or `payment_status` present and !== 'PAID'.
- **Amount check**: webhook compares `body.amount` to the stored tx amount; mismatch ⇒ roll back to pending + 400.
- **Provision-failure recovery**: on Mikrotik provision failure, roll back to `pending` and return **500** so SanPay retries later (buyer paid; stays recoverable). Success ⇒ 200.
- **No client-trusted minting**: the old insecure `POST /api/transactions/public` was removed. `POST /api/transactions` now only accepts `payment_method='saldo'` — QRIS must go through create-qris + webhook.

**Why:** vouchers are money; they may only be issued after a real, signature-verified, amount-matched payment callback — never on client assertion.
