---
name: Qiospay static payment constraints
description: User-approved unique nominal payment approach and safeguards for static QRIS without order references.
---

The user chose “Siapkan QR statis + nominal unik” for Qiospay. Show the extra nominal and full charged amount clearly; it is not silently refunded.

**Why:** Qiospay's public documentation provides a merchant QR string, mutation ledger API and callbacks, but no documented order-creation/reference-echo API.

**How to apply:** Preserve historical transactions. Do not claim live compatibility until the user's newly configured account has been tested.

Never recycle an exact merchant payment total for automatic order matching, including expired/successful invoices. Keep persistent reservations and reject exhaustion explicitly.

**Why:** Static QR payment instructions cannot be remotely expired. Reusing a nominal lets a late or repeated payment for an old invoice incorrectly fulfill a new buyer's invoice.

**How to apply:** Do not remove reservations with transaction cleanup. Changing this rule requires a provider-supported per-order reference/cancellation mechanism, not merely a time delay.

Only a verified credit in the authenticated merchant mutation ledger can pay an invoice. Callback fields are wake-up notifications, not independently trusted proof. Outside-window or duplicate actual credits require manual review.

**Why:** The callback sample authenticates a URL secret, not a signed order-specific payload; its reference is not documented as an app order ID.

**How to apply:** Maintain exact amount/time checks, credit deduplication, durable paid states, and stable router voucher candidates across retries. Preserve buyer-facing disclosure of unique amounts and static-QR limitations.

Untuk pengaturan admin, pengguna meminta: “buat simpel setingan QRIS Qiospay, tidak usah kasih keterangan atau Note.”

**Why:** Pengguna menyatakan halaman terlihat berantakan karena keterangannya.

**How to apply:** Keep the admin QRIS form compact, with field labels and essential save/error feedback rather than explanatory notes. This presentation preference does not remove payment safeguards or buyer-facing amount disclosure.