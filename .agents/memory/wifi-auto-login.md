---
name: Automatic hotspot login after voucher purchase
description: User-requested purchase-to-internet flow and MikroTik captive-portal constraints
---

Pengguna menginginkan setelah pembelian voucher melalui QRIS atau saldo berhasil, login hotspot berjalan otomatis sesuai paket yang dibeli, tanpa memasukkan ulang kode voucher.

**Why:** Pengguna meminta alur yang lebih praktis dan premium: “ketika user beli dan sukses wifi otomatis terhubung dan internet mengalir.”

**How to apply:** Treat payment confirmation, voucher provisioning on the correct router/profile, and hotspot authentication as separate steps. Automate login only after the voucher is ready. Do not claim internet is active merely because payment succeeded. Retain the voucher and a manual Login WiFi fallback if automatic navigation or authentication cannot finish. This requirement concerns voucher purchases, not wallet funding by itself.

Hotspot authentication must reach the client's actual MikroTik hotspot gateway, which is distinct from the router API host.

**Why:** Authentication grants access to the connected client; a server-side API address is not necessarily reachable as that client's captive-portal login address.

**How to apply:** Preserve trusted hotspot context through purchase and respect the router's configured authentication method, including CHAP where applicable. Never send voucher credentials to an arbitrary gateway URL supplied by an untrusted redirect.

Use browser navigation rather than cross-origin fetch for client hotspot login.

**Why:** Captive-portal cross-origin requests encounter CORS and HTTPS-to-HTTP restrictions. Even a top-level form may prompt an insecure-form warning when an HTTPS app submits to an HTTP gateway; automatic login cannot be guaranteed across browsers or closed/background captive-portal windows.

**How to apply:** Prefer a correctly configured secure gateway, preserve a user-initiated login fallback, and do not promise silent automatic internet access on every device.
