# PPOB Digiflazz — aktivasi dan keamanan

## Lingkup

PPOB prabayar untuk pulsa, paket data, dan token PLN menggunakan **saldo akun pelanggan**. Ini terpisah dari voucher MikroTik, QRIS Qiospay, dan deposit merchant Digiflazz. QRIS langsung untuk PPOB dan tagihan pascabayar belum termasuk.

Tidak ada produk contoh atau transaksi pura-pura pada katalog aplikasi. Tanpa kredensial lengkap, layanan terkunci dan tidak memotong saldo. Mode **test** dapat memeriksa koneksi dan mengimpor katalog nyata, tetapi **tidak** mengizinkan pembelian dengan saldo pelanggan.

## Menyiapkan akun Buyer

1. Isi `DIGIFLAZZ_USERNAME`, `DIGIFLAZZ_API_KEY`, dan `DIGIFLAZZ_WEBHOOK_SECRET` melalui Replit Secrets. Untuk instalasi sendiri, gunakan `.env` privat dan jangan commit file tersebut. Username di sini adalah username koneksi API Buyer, bukan otomatis email login member.
2. Buat secret webhook acak dengan panjang minimal 32 karakter. Isi **secret yang sama** pada Digiflazz → Atur Koneksi → API → Webhook.
3. Daftarkan URL webhook dari **domain HTTPS aplikasi yang benar-benar digunakan** ditambah `/api/ppob/webhook`. Jangan gunakan URL localhost atau URL development untuk produksi. Webhook menerima JSON prabayar dan `X-Hub-Signature: sha1=...`.
4. Atur whitelist IP keluar server pada menu koneksi Buyer. Pastikan deposit merchant cukup; deposit ini bukan saldo pelanggan. Aplikasi tidak mentransfer deposit merchant.
5. Restart server setelah memasang atau mengganti kredensial server.
6. Admin → **PPOB** → periksa koneksi → sinkronkan katalog → pilih produk dan tentukan harga jual → simpan konfigurasi live dan aktifkan layanan.

Sinkronisasi mengimpor kategori Pulsa, Data, dan PLN dari daftar **prepaid**. Produk baru selalu nonaktif. Label, deskripsi, aktivasi, harga tetap, dan markup yang dikelola admin dipertahankan saat sinkronisasi.

## Persyaratan produksi

- Gunakan TLS/HTTPS, `COOKIE_SECURE=true`, dan `SESSION_SECRET` acak minimal 32 karakter; placeholder bawaan tidak boleh digunakan.
- Ganti password administrator bawaan dan password akun demo sebelum menggunakan transaksi nyata. PIN enam digit harus dibuat sendiri, dengan verifikasi password saat ini.
- Gunakan reverse proxy yang benar-benar dipercaya. Jangan membuka port HTTP backend ke internet hanya untuk memalsukan `X-Forwarded-Proto`; batasi akses backend ke proxy/LAN yang dipercaya.
- Pada Docker, simpan `POSTGRES_PASSWORD`, `DATABASE_URL`, `SESSION_SECRET`, variabel Digiflazz, dan `COOKIE_SECURE` dalam `.env` privat yang tidak di-commit. Compose mewajibkan konfigurasi database dan sesi sebelum start. Untuk deployment dengan volume PostgreSQL yang sudah ada, gunakan kembali password DB yang saat ini dipakai oleh volume serta `SESSION_SECRET` yang saat ini digunakan; jangan merotasi atau mengubah kredensial produksi dalam proses pembaruan ini. Tidak perlu mengganti arsitektur ARM64 atau menghapus volume PostgreSQL.
- Harga/stok dari katalog yang lebih tua dari 30 menit tidak dapat dibeli. Sinkronisasi otomatis berjalan sekitar setiap 15 menit saat layanan aktif, dengan jeda percobaan saat pemasok bermasalah. Pemeriksaan deposit/koneksi otomatis sekitar setiap enam jam; koneksi yang tidak dapat diverifikasi selama 24 jam mengunci pembelian baru.

## Perlindungan transaksi

- Identitas, saldo, hak admin, dan kepemilikan pesanan ditentukan sesi server; perubahan peran/pemblokiran berlaku segera.
- Request perubahan memakai token CSRF yang terikat sesi dan pemeriksaan origin. Situs lain tidak diberi akses CORS berkredensial.
- Harga berasal dari server. Penawaran berlaku dua menit; perubahan modal, harga jual, kategori, stok, cut-off WIB atau aktivasi membatalkan pembelian **sebelum** debit.
- PIN disimpan sebagai bcrypt, tidak dikirim ke Digiflazz, tidak dicatat dan tidak disimpan di browser. Lima kesalahan PIN mengunci transaksi selama 15 menit. Perubahan PIN/password memerlukan password saat ini dan membatalkan sesi lainnya.
- Batas per pesanan dan batas harian akun dihitung di bawah lock database, termasuk saldo yang masih ditahan untuk pesanan pending/review.
- Debit, pesanan, catatan saldo dan audit disimpan dalam satu transaksi PostgreSQL. Worker hanya mengirim pesanan yang sudah committed.
- Kunci idempotensi dan satu penawaran mencegah debit berulang. Referensi pemasok, nomor tujuan, SKU dan batas harga modal tetap sama saat retry status yang diizinkan.
- Browser menyimpan referensi pemulihan **sebelum** request pembelian. Saat respons hilang, browser memulihkan pesanan dari server; quote expired bukan alasan untuk membuat debit kedua. Ketiadaan respons bukan bukti bahwa uang tidak bergerak.
- Callback HMAC diperiksa dengan perbandingan waktu konstan atas byte JSON asli. Bahkan callback bertanda tangan hanya memicu pemeriksaan API, tidak langsung mengubah saldo atau hasil.
- Sukses/gagal hanya diterima dari API HTTPS Digiflazz setelah referensi, tujuan, SKU, harga dan status konsisten. Token PLN tanpa serial belum dianggap berhasil.
- Hanya respons `Pending` terdokumentasi (RC 03/99) yang boleh dikirim ulang ke endpoint Buyer API dengan `ref_id` yang sama untuk pemeriksaan status. Timeout transport dan hasil tanpa respons tetap masuk review, saldo ditahan, serta tidak dikirim ulang otomatis maupun lewat Admin.
- Kegagalan final yang terverifikasi mengembalikan saldo dan menulis refund tepat satu kali dalam transaksi yang sama. Admin tidak mempunyai tombol untuk mengarang sukses atau memaksa refund.
- Kode respons mengikuti tabel resmi Digiflazz. Kebijakan produk yang dipilih pemilik adalah mengembalikan saldo untuk respons API `Gagal` yang identitas dan harganya cocok, termasuk RC 01/70. Dokumentasi resmi menyebut RC 01/70 berstatus `Gagal` dan transaksi terbentuk `Ya`, tetapi tidak menjamin finalitasnya; keberhasilan pemasok yang datang terlambat setelah refund tidak membuka order final kembali. Ini adalah risiko bisnis yang diterima, bukan kepastian dari Digiflazz. Status `Gagal` dari error **request** (misalnya signature/IP) setelah percobaan sebelumnya tidak membuktikan transaksi lama gagal. Referensi tidak unik, transaksi tidak ditemukan, pembatasan API dan kode tidak dikenal ditahan untuk review. Penolakan request yang diketahui tidak membentuk transaksi hanya dapat refund pada percobaan pertama yang tidak ambigu.
- Katalog penuh Digiflazz dibatasi sekali per lima menit; batas ini dipertahankan lintas restart dan kegagalan koneksi.
- Pesanan finansial mencegah penghapusan akun. Blokir akun jika perlu, jangan menghapus catatan keuangan.

## Saat pesanan tertunda

Pelanggan melihat status dan riwayat di menu PPOB. Jangan membeli ulang nomor/SKU yang sama selama pending atau review. Admin dapat meminta **cek ulang** tanpa mengubah referensi dan tanpa debit baru. Worker memulihkan antrean tersimpan setelah restart.

Jika kredensial merchant diganti, pesanan lama tidak dikirim melalui akun merchant lain. Pulihkan kredensial akun asli dan gunakan cek ulang. Hubungi Digiflazz untuk status pemasok yang bertentangan; jangan mengganti hasil atau mengembalikan saldo secara manual tanpa rekonsiliasi.

## Pengujian

`npm run test:ppob` memakai schema PostgreSQL terisolasi dan pemasok yang diinjeksi untuk pengujian. Tidak menghubungi Digiflazz, tidak memotong saldo akun aplikasi, dan tidak menyediakan voucher MikroTik. Pengujian browser checkout menggunakan intersepsi respons **hanya di browser tester**, bukan katalog atau transaksi contoh yang ditanam di aplikasi. Pengujian ini bukan bukti transaksi pemasok live.

Dokumentasi resmi:
- https://developer.digiflazz.com/api/buyer/persiapan/
- https://developer.digiflazz.com/api/buyer/daftar-harga/
- https://developer.digiflazz.com/api/buyer/topup/
- https://developer.digiflazz.com/api/buyer/webhook/
- https://developer.digiflazz.com/api/buyer/cek-saldo/
- https://developer.digiflazz.com/api/buyer/response-code/