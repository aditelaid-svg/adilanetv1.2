---
name: PPOB scope and financial safety
description: Approved first phase, wallet/supplier boundaries and conservative handling of uncertain fulfillment.
---

The approved first phase is prepaid pulsa, data, and token PLN paid with customer saldo. Direct QRIS PPOB and postpaid billing are deferred. Digiflazz is the supplier, not a replacement for Qiospay.

**Why:** The user approved this staged scheme and explicitly requested very strict transaction security and professional enterprise-style presentation.

**How to apply:** Keep merchant deposit separate from customer wallet money, keep hotspot voucher login separate from account ownership, and never substitute demo catalog/products when supplier credentials are missing. Test mode must not debit real customer wallets.

Transport timeouts without an authenticated provider result retain the immutable reference and reserved funds. RC 01 and RC 70 are documented as `Gagal` but finality is unconfirmed; hold the balance for review and do not refund or retry automatically. Authenticated webhooks are wake-ups, not financial authority.

**Why:** Official Digiflazz docs label RC 01/70 `Gagal` and transaction formed `Ya`, but do not say whether those statuses are terminal. A premature refund can create unrecovered loss if the supplier later succeeds.

**How to apply:** Preserve committed purchase recovery across browser/server restarts and credential changes. Never retry without a provider response; only repeat the same `ref_id` for documented `Pending` checks. Keep RC 01/70 in manual review until written provider confirmation; do not let callbacks directly change money or final orders. Require real token serials before marking PLN delivered.

A Digiflazz response labelled `Gagal` is not always a failed financial transaction: its official response-code table also uses that status for rejected requests.

**Why:** Signature, IP whitelist and API-limit errors during a later status check say nothing conclusive about an earlier submitted purchase.

**How to apply:** Distinguish documented final transaction failure from request rejection, and preserve submission-attempt history. Never refund an ambiguous earlier purchase merely because a subsequent check was rejected.

Official Digiflazz docs may return HTTP 402 through the web-search scraper while their public documentation pages remain directly fetchable with `curl`.

**Why:** A scraper failure alone does not prove the supplier's documentation is unavailable, and API contract claims must not be guessed.

**How to apply:** Fetch the linked official Buyer API pages directly and inspect their request, response-code, and webhook tables before asserting contract compatibility.