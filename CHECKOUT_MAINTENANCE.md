# Mode Maintenance Checkout

Dokumen ini menjelaskan bagaimana cara menonaktifkan/mengaktifkan halaman checkout
pada storefront, serta daftar perubahan kode yang menyertainya.

## Latar Belakang

Fitur ini dibuat karena pada kondisi tertentu (misalnya sistem pembayaran/shipping
di production masih dalam proses verifikasi oleh **Biteship** dan **Midtrans**),
checkout harus ditutup sementara agar pelanggan tidak membuat pesanan yang tidak
dapat diproses.

## Cara Kerja

Mode maintenance dikontrol oleh **environment variable** `CHECKOUT_ENABLED`:

| Nilai | Perilaku |
|-------|----------|
| tidak diset / `true` | Checkout berjalan normal (default) |
| `false` | Checkout dinonaktifkan |

Saat `CHECKOUT_ENABLED=false`, yang terjadi:

1. Halaman `/checkout` **redirect** ke `/cart` (berlaku untuk semua pengguna, login
   ataupun tidak).
2. Di halaman `/cart`, tombol **"Lanjut ke Checkout"** diganti dengan **notifikasi
   maintenance** + tombol **"Hubungi via WhatsApp"**.
3. Tombol **"Bayar Sekarang"** pada halaman detail pesanan (status menunggu
   pembayaran) disembunyikan.
4. Halaman lain (katalog, detail produk, keranjang isi/ubah) tetap berfungsi normal.

> Catatan: scope ini adalah **minimal** — API pembuatan order (`create-transaction`)
> tidak diblokir. Karena tidak ada lagi jalan masuk ke halaman checkout, API tetap
> aman dari akses pengguna normal.

## Cara Mengaktifkan / Menonaktifkan

### Lokal (dev)

Edit file `.env` di root proyek:

```bash
# Checkout AKTIF (default)
CHECKOUT_ENABLED=true

# Checkout NONAKTIF (maintenance)
CHECKOUT_ENABLED=false
```

Lalu restart dev server: `npm run dev`

### Produksi (Vercel)

**Cara 1 — Vercel Dashboard (paling mudah):**

1. Buka proyek `bjs-racing-store` di dashboard Vercel.
2. Masuk ke **Settings → Environment Variables**.
3. Tambah/edit variable `CHECKOUT_ENABLED`:
   - untuk **Production**: nilai `false` (maintenance) atau `true` (normal).
4. Vercel akan otomatis membuat deployment baru setelah env berubah
   (atau klik **Redeploy** pada deployment terakhir).

**Cara 2 — Vercel API (CLI):**

```bash
# Menambahkan var environment Production
vercel env add CHECKOUT_ENABLED false production

# Menghapus var (kembali ke default = aktif)
vercel env rm CHECKOUT_ENABLED production

# Deploy ulang agar perubahan env diterapkan
vercel --prod
```

> Penting: karena nilai `CHECKOUT_ENABLED` dibaca pada saat build, setiap perubahan
> env **harus diikuti deployment ulang** agar aktif.

## Perilaku Saat Env Tidak Diset

Jika `CHECKOUT_ENABLED` tidak ada, dianggap `true` (checkout aktif). Jadi menambahkan
kode ini ke production **tidak** mengubah perilaku sampai env `CHECKOUT_ENABLED=false`
diset.

## Perubahan Kode

Daftar file yang diubah untuk fitur ini:

- `src/middleware.js` — guard redirect `/checkout` → `/cart` saat maintenance
  (diletakkan sebelum gerbang autentikasi).
- `src/pages/cart.astro` — menghitung `checkoutEnabled` dari env dan meneruskan
  sebagai prop ke `CartView`.
- `src/components/CartView.jsx` — menerima prop `checkoutEnabled`; menampilkan
  notifikasi maintenance + tombol WhatsApp menggantikan tombol "Lanjut ke Checkout".
- `src/pages/checkout.astro` — guard defensif: redirect ke `/cart` saat maintenance.
- `src/pages/akun/pesanan/[order_id].astro` — menyembunyikan tombol "Bayar Sekarang"
  saat maintenance.
- `.env.example` — dokumentasi variable `CHECKOUT_ENABLED`.

## Teks Notifikasi

**Heading:** Checkout Sementara Tidak Tersedia

**Isi:** Mohon maaf, saat ini kami sedang melakukan pemeliharaan pada sistem
pembayaran dan pengiriman, sehingga proses checkout belum dapat dilakukan. Untuk
tetap bisa berbelanja, silakan hubungi tim kami melalui WhatsApp di 0881011669213.
Kami akan dengan senang hati membantu Anda memproses pesanan secara manual. Terima
kasih atas pengertian dan kesabaran Anda.

**Tombol:** Hubungi via WhatsApp (wa.me/62881011669213)
