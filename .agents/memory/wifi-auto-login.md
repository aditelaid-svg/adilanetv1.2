---
name: Automatic hotspot login after voucher purchase
description: User-requested purchase-to-internet flow and MikroTik captive-portal constraints
---

Pengguna menginginkan setelah pembelian voucher melalui QRIS atau saldo berhasil, login hotspot berjalan otomatis sesuai paket yang dibeli, tanpa memasukkan ulang kode voucher.

**Why:** Pengguna meminta alur yang lebih praktis dan premium: “ketika user beli dan sukses wifi otomatis terhubung dan internet mengalir.”

**How to apply:** Treat payment confirmation, voucher provisioning on the correct router/profile, and hotspot authentication as separate steps. Automate login only after the voucher is ready. Do not claim internet is active merely because payment succeeded or the browser returned to the portal. Retain the voucher and a manual Login WiFi fallback if automatic navigation or authentication cannot finish. This requirement concerns voucher purchases, not wallet funding by itself.

Login otomatis hanya berlaku jika perangkat pembeli sedang berada di jaringan hotspot AdilaNet. Pembelian dari luar jaringan tetap menghasilkan kode voucher untuk dimasukkan manual setelah pelanggan terhubung ke hotspot.

**Why:** Pengguna mengonfirmasi: “jika pelanggan beli voucer sedang ada d jaringan adilanet otomatis tapi jika sedang d luar jaringan adilanet kode ttap masuksn manual.”

**How to apply:** Gate automatic login on trusted hotspot context and current gateway reachability; do not infer WiFi attachment merely from a successful purchase, a saved gateway URL, or stale browser context. If the network cannot be established, show the voucher and manual-login path without claiming internet is active.

Portal utama tetap menyediakan kolom untuk memasukkan voucher WiFi yang sudah dimiliki, dengan tombol Login WiFi, selain alur Beli Voucher.

**Why:** Pengguna menegaskan: “Tapi sediakan juga kolom untuk masukan voucher wifi.”

**How to apply:** Make manual voucher entry available before any purchase, not only as a fallback after automatic login fails.

Hotspot authentication must reach the client's actual MikroTik hotspot gateway, which is distinct from the router API host.

**Why:** Authentication grants access to the connected client; a server-side API address is not necessarily reachable as that client's captive-portal login address.

**How to apply:** Preserve trusted hotspot context through purchase and respect the router's configured authentication method, including CHAP where applicable. Never send voucher credentials to an arbitrary gateway URL supplied by an untrusted redirect.

Use browser navigation rather than cross-origin fetch for client hotspot login.

**Why:** Captive-portal cross-origin requests encounter CORS and HTTPS-to-HTTP restrictions. Even a top-level form may prompt an insecure-form warning when an HTTPS app submits to an HTTP gateway; automatic login cannot be guaranteed across browsers or closed/background captive-portal windows.

**How to apply:** Prefer a correctly configured secure gateway, preserve a user-initiated login fallback, and do not promise silent automatic internet access on every device.

Generate HTTP-CHAP credentials from a fresh gateway challenge after checkout, not from the challenge captured when the customer first opened the portal.

**Why:** QRIS checkout can take several minutes, and reopening the gateway changes its challenge. Reusing the initial challenge can reject an otherwise valid, successfully purchased voucher.

**How to apply:** Keep authentication in a small self-contained MikroTik bridge, preserve CHAP support, and avoid external hashing-script dependencies. Server-hosted presentation must not replace MikroTik's client authentication: preserve the local native login submission even when all visible UI is hosted externally, rather than replacing the bridge with an unconditional server redirect.
