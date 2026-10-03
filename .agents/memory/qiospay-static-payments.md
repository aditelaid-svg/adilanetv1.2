---
name: Qiospay static payment constraints
description: User-approved unique nominal payment approach and safeguards for static QRIS without order references.
---

The user chose “Siapkan QR statis + nominal unik” for Qiospay. Show the extra nominal and full charged amount clearly; it is not silently refunded.

**Why:** Qiospay's public documentation provides a merchant QR string, mutation ledger API and callbacks, but no documented order-creation/reference-echo API.

**How to apply:** Preserve historical transactions. Do not claim live compatibility until the user's newly configured account has been tested.

Never recycle an exact merchant payment total for automatic order matching, including expired/successful invoices. Keep persistent reservations and reject exhaustion explicitly.

**Why:** Neither a static QR nor a locally generated amount-bearing QR can be remotely expired through the documented Qiospay API. Encoding a total and dynamic initiation flag is not a provider-created order. Reusing a nominal lets a late or repeated payment for an old invoice incorrectly fulfill a new buyer's invoice.

**How to apply:** Do not remove reservations with transaction cleanup. Changing this rule requires a provider-supported per-order reference/cancellation mechanism, not merely a time delay.

Pengguna memilih kode unik sampai 200 karena pembayaran QRIS belum banyak. Gunakan kode kecil berurutan tanpa reset harian.

**Why:** The user wants smaller additions. Retaining permanent total reservations prevents late payment of an old QR from fulfilling a new order. Setelah perubahan kode unik dan nominal pada QR, pengguna mengonfirmasi: “sekarang sudah bagus dan lancar.”

**How to apply:** Preserve legacy invoices, including codes above 200; do not renumber or remove historical reservations. Stop new checkout when no safe total remains in the selected range.

Only a verified credit in the authenticated merchant mutation ledger can pay an invoice. Callback fields are wake-up notifications, not independently trusted proof. Outside-window or duplicate actual credits require manual review.

**Why:** The callback sample authenticates a URL secret, not a signed order-specific payload; its reference is not documented as an app order ID.

**How to apply:** Maintain exact amount/time checks, credit deduplication, durable paid states, and stable router voucher candidates across retries. Preserve buyer-facing disclosure of unique amounts and static-QR limitations.

Untuk pengaturan admin, pengguna meminta: “buat simpel setingan QRIS Qiospay, tidak usah kasih keterangan atau Note.”

**Why:** Pengguna menyatakan halaman terlihat berantakan karena keterangannya.

**How to apply:** Keep the admin QRIS form compact, with field labels and essential save/error feedback rather than explanatory notes. This presentation preference does not remove payment safeguards or buyer-facing amount disclosure.

Qiospay's narrowly recognized HTTP 200 / `status: "error"` / missing-mutation-data response represents zero credits, not a failed checkout or a paid invoice.

**Why:** Live read-only checks returned this response for the saved account. Both nonexistent credentials and the same saved merchant with a deliberately invalid test key returned HTTP 401 instead. Blocking an empty ledger prevented first-time checkout before a QR could be displayed. The public documentation omits this empty-ledger behavior. Pengguna kemudian mengonfirmasi QRIS berhasil muncul dan pembayaran nyata otomatis menghasilkan voucher.

**How to apply:** Recognize only specific empty-data messages with HTTP 200, exact status `error`, and absent/null/empty-array data. Reject all other errors and malformed envelopes without exposing provider messages. Zero credits may allow a pending QR invoice, never payment success or voucher fulfillment.