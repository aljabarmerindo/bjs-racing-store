# Eruda Debug Console — Cara Menampilkan

Dokumen ini menjelaskan cara menampilkan **eruda** (konsol debug mobile) di aplikasi STORE, serta cara menyembunyikannya kembali.

## Ringkasan Cara Kerja

Eruda dikendalikan oleh **2 gerbang** di `src/layouts/MainLayout.astro`:

| Gerbang | Waktu | Kondisi | Efek |
|---|---|---|---|
| **1. Env (build-time)** | Saat `astro build` | `PUBLIC_ENABLE_ERUDA="1"` **atau** mode lokal (`PROD=false`) | Script CDN eruda **dimuat** ke HTML |
| **2. URL (runtime)** | Saat halaman dibuka | URL mengandung `?eruda=1` | Eruda **ditampilkan** (inisialisasi) |

Artinya:

- **Bawaan (default): eruda TIDAK PERNAH muncul otomatis** — bahkan setelah deploy otomatis Vercel dari push git.
- Env hanya mengontrol *apakah script dimuat* (dormant), bukan *apakah tampil*.
- Tampil/muncul selalu butuh `?eruda=1` di URL, berlaku per sesi browsing (hilang saat reload tanpa param).

## Lokasi Kode

```
src/layouts/MainLayout.astro
  - frontmatter : const erudaEnabled = import.meta.env.PUBLIC_ENABLE_ERUDA === "1" || !import.meta.env.PROD;
  - akhir body  : tag <script src="//cdn.jsdelivr.net/npm/eruda"> + guard ?eruda=1
```

## Cara Menampilkan Eruda di Production (Vercel)

### Langkah 1 — Set Environment Variable (sekali)

1. Buka dashboard Vercel: https://vercel.com
2. Pilih project **bjs-racing-store**
3. Menu **Settings → Environment Variables**
4. Tambah variable baru:
   - **Key**: `PUBLIC_ENABLE_ERUDA`
   - **Value**: `1`
   - **Environments**: centang **Production** (dan Preview/Development bila perlu)
5. Klik **Save**

> Tidak perlu mengubah kode sama sekali — hanya env + deploy.

### Langkah 2 — Deploy ulang (sekali)

1. Menu **Deployments**
2. Pilih deployment paling atas (terbaru)
3. Klik ikon **⋮** (menu) → **Redeploy**
   - Centang *"Use existing Build Cache"* bila ingin cepat (opsional)
4. Tunggu hingga status **Ready** (±2-5 menit)

> Setelah langkah ini, eruda tersedia selamanya sampai env dihapus — deploy-deploy berikutnya (push git) tetap memuat script, tapi **tetap tersembunyi** sampai URL pakai `?eruda=1`.

### Langkah 3 — Tampilkan Eruda

1. Buka aplikasi dengan menambah param di URL, contoh:

```
https://bjs-racing-store.vercel.app/?eruda=1
```

2. Eruda langsung muncul (ikon lingkaran oranye di pojok kanan bawah).

### Toggle Tanpa Deploy (setelah env ter-set)

- **Muncul**: buka URL dengan `?eruda=1` → contoh: `/akun/pesanan?eruda=1`
- **Hilang**: buka URL tanpa param (reload) → eruda tidak muncul

## Cara Menyembunyikan Eruda Total Lagi

1. Vercel → **Settings → Environment Variables** → hapus `PUBLIC_ENABLE_ERUDA` (atau ubah nilai selain `1`)
2. **Redeploy** seperti langkah 2 di atas
3. Setelah deployment **Ready**, script CDN tidak lagi dimuat → produksi bersih kembali

## Mode Lokal (Development)

Saat menjalankan `npm run dev`, gerbang env otomatis aktif (`PROD=false`), jadi:

1. Jalankan: `npm run dev`
2. Buka: `http://localhost:4321/?eruda=1`
3. Eruda muncul. Tanpa param → tersembunyi.

## Troubleshooting

| Gejala | Solusi |
|---|---|
| Eruda tidak muncul walau sudah `?eruda=1` | Pastikan env `PUBLIC_ENABLE_ERUDA=1` sudah ter-set **sebelum** redeploy terakhir; cek Vercel **Deployments → build log** untuk nilai env |
| Env sudah di-set tapi deployment lama | Redeploy ulang — env hanya berlaku pada build baru |
| Masih tidak muncul setelah redeploy | Hard refresh (Ctrl+Shift+R) / buka di **mode incognito** / coba perangkat lain (masalah cache browser) |
| Ingin verifikasi script dimuat | DevTools (desktop) → Network → cari request `eruda` — harus ada jika env aktif, tidak ada jika env off |
| Eruda tampil tiba-tiba | Pastikan tidak ada URL yang mengandung `?eruda=1`; jika ada, hapus env + redeploy |

## Catatan Performa & Keamanan

- `eruda.js` ±245 KB (raw) / ±80 KB (gzip), dimuat **sinkron (render-blocking)**.
- Karena itu default-nya **tidak dimuat** di production agar kecepatan browsing (terutama koneksi 3G/perangkat low-end) tidak terganggu.
- Jangan set env `PUBLIC_ENABLE_ERUDA=1` secara permanen — hanya saat sesi debugging berlangsung.
- Eruda hanya berjalan di sisi client (browser); tidak mengirim data ke server.
