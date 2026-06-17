# AdilaNet — Manajemen Voucher WiFi Mikrotik

Aplikasi web PWA untuk manajemen voucher WiFi Mikrotik dengan fitur:
- Beli & kelola voucher WiFi
- Integrasi profil Hotspot Mikrotik secara langsung
- Pembayaran QRIS via Sanpay
- Dashboard admin lengkap
- Bisa diinstall sebagai aplikasi (PWA)

---

## 🐳 Deploy via Docker / Dockge

### Langkah 1 — Upload kode ke GitHub

1. Buat repository baru di [github.com](https://github.com/new)
2. Di Replit, buka panel **Version Control** (ikon Git di sidebar kiri)
3. Klik **Connect to GitHub** → pilih repo yang baru dibuat
4. Klik **Push** untuk upload semua file

### Langkah 2 — Buka Dockge di server kamu

Buka Dockge (biasanya di `http://IP_SERVER:5001`), klik **+ Compose**, lalu paste isi `docker-compose.yml` di bawah.

### Langkah 3 — Edit `docker-compose.yml`

Edit **3 bagian** sebelum deploy:

```yaml
# 1. Ganti URL GitHub dengan repo kamu
context: https://github.com/GITHUB_USERNAME/NAMA_REPO.git

# 2. Ganti password database (sama di kedua tempat)
POSTGRES_PASSWORD: password_kamu_disini
DATABASE_URL: postgres://adilanet:password_kamu_disini@db:5432/adilanet

# 3. Ganti IP server kamu (untuk webhook QRIS)
APP_URL: "http://192.168.1.100:5000"
```

### Langkah 4 — Deploy

Di Dockge klik **Deploy** → tunggu build selesai (~2-3 menit pertama kali).

Akses aplikasi di: `http://IP_SERVER:5000`

---

## 🔑 Login Default

| Role  | Username       | Password |
|-------|---------------|----------|
| Admin | 08999999999   | admin    |
| User  | 081234567890  | user123  |

> **Penting:** Ganti password default setelah login pertama!

---

## ⚙️ Update Aplikasi

Setelah push kode baru ke GitHub:

**Cara manual** — Di Dockge klik **Pull & Restart**:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Cara otomatis** — Aktifkan service `watchtower` di `docker-compose.yml` (sudah disertakan).
Watchtower akan cek update setiap 5 menit dan restart app otomatis.

---

## 🔧 Konfigurasi Mikrotik

1. Login sebagai Admin → **Pengaturan** → **Router**
2. Tambah router dengan:
   - IP Address router (contoh: `192.168.1.1`)
   - Username & password Winbox/API RouterOS
3. Di halaman **Voucher** → profil hotspot akan ter-fetch otomatis dari router

---

## 💳 Aktifkan QRIS / Payment

1. Daftar di [sanpay.site](https://sanpay.site)
2. Isi `SANPAY_API_KEY` dan `SANPAY_MERCHANT_ID` di `docker-compose.yml`
3. Set `APP_URL` ke URL publik server (untuk menerima webhook)

---

## 📁 Struktur File

```
├── server.ts           # Backend Express + API + DB auto-init
├── src/
│   ├── App.tsx          # Router utama + PWA prompt
│   ├── AppContext.tsx   # State global dari API
│   ├── pages/          # Halaman admin & user
│   └── server/
│       └── mikrotik.ts # Koneksi RouterOS API
├── public/
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service Worker
├── Dockerfile          # Multi-stage build (Node 20 Alpine)
└── docker-compose.yml  # PostgreSQL + App + Watchtower
```

---

## 🛠️ Development Lokal

```bash
npm install
cp .env.example .env
# Isi DATABASE_URL di .env
npm run dev
```

Akses di: `http://localhost:5000`
