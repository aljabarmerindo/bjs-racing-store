# Vercel Fluid Active CPU — Analisa & Rencana Tindakan

## Kondisi Saat Ini

| Metrik | Nilai |
|--------|-------|
| Plan | Vercel Hobby (Free) |
| Active CPU Used | **3 jam 2 menit** dari 4 jam/bulan |
| Sisa CPU | **58 menit** |
| Persentase Used | **~75.5%** |
| Provisioned Memory | 360 GB-hrs/bulan |
| Bandwidth | 100 GB/bulan |

**Status: KRITIS — Sisa 58 menit CPU sebelum site berhenti menjalankan serverless functions.**

---

## Apa itu Fluid Active CPU?

Fluid Active CPU mengukur waktu CPU yang **benar-benar digunakan** oleh kode saat menjalankan request.

- **Dihitung:** Waktu eksekusi kode (JavaScript/TypeScript)
- **TIDAK dihitung:** Waktu tunggu I/O (database query, API calls, AI models)
- **Satuan:** CPU-hours per 30 hari

> *"You are only billed during actual code execution and not during I/O operations."*
> — Vercel Docs

### Limit Vercel Hobby (Free)

| Resource | Limit | Reset |
|----------|-------|-------|
| Active CPU | **4 jam/bulan** | Setiap 30 hari |
| Provisioned Memory | 360 GB-hrs/bulan | Setiap 30 hari |
| Function Invocations | 1 juta/bulan | Setiap 30 hari |
| Bandwidth | 100 GB/bulan | Setiap 30 hari |
| Function Duration | 300 detik (5 menit) | Per invocation |
| Concurrent Builds | 1 | — |
| Deployments | 100/hari | — |

### Apa yang Terjadi Saat Limit Habis?

Dari dokumentasi Vercel:

> *"As the Hobby plan is a free tier there are no billing cycles. In most cases, if you exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed before you can use the feature again."*

- **Site TIDAK down** untuk static pages (prerendered dari CDN)
- **Dynamic pages BERHENTI berfungsi** — cart, checkout, akun, products/[id], semua API endpoints
- Tidak ada error 503 — function executions hanya di-pause
- Setelah 30 hari, limit reset ke 0

### Tambahan: Pelarangan Komersial

> *"The Hobby plan restricts users to non-commercial, personal use only."*

Toko online (e-commerce) = komersial = **melanggar ToS Vercel**. Akun bisa di-suspend kapan saja.

---

## Analisa: Mengapa CPU Cepat Habis?

### Arsitektur Saat Ini

```
output: 'server'  ← SEMUA halaman di-server-render
```

Setiap request ke halaman manapun memicu:

1. **Middleware** berjalan → Supabase auth check + profile query
2. **Serverless function** dijalankan → render halaman
3. **Response** dikirim ke user

### Breakdown CPU Usage

| Komponen | CPU per request | Catatan |
|----------|----------------|---------|
| Middleware (auth check) | ~50-100ms | Supabase getSession + profile query |
| SSR page render | ~50-200ms | Rendering Astro + React components |
| API calls (product data) | ~100-300ms | Supabase queries |
| **Total per dynamic page view** | **~200-600ms** | |

### Estimasi CPU Consumption

Dengan asumsi ~50-100 pengunjung/hari yang aktif browse:

| Aktivitas | Estimasi CPU/hari |
|-----------|-------------------|
| Homepage views (SSR) | ~2-5 menit |
| Product browsing (/pilok, /onderdil) | ~5-10 menit |
| Product detail views | ~3-8 menit |
| Cart + Checkout | ~1-3 menit |
| API calls (auth, search, dll) | ~2-5 menit |
| **Total estimasi/hari** | **~13-31 menit** |

Dalam 30 hari: **~6-15 jam CPU** → melebihi limit 4 jam.

---

## Optimasi yang Sudah Dilakukan

### Prerender 11 Static Pages

Commit: `216cad2` — Ditambahkan `export const prerender = true` di:

| # | Halaman | Catatan |
|---|---------|---------|
| 1 | `/` (homepage) | Data promo/stats di-fetch saat build |
| 2 | `/pilok` | Data produk di-fetch client-side |
| 3 | `/onderdil` | Data produk di-fetch client-side |
| 4 | `/katalog-warna` | Static |
| 5 | `/lokasi-toko` | Static + `client:only="react"` untuk map |
| 6 | `/jangkauan-pengiriman` | Static + `client:only="react"` untuk map |
| 7 | `/scan-warna` | Static |
| 8 | `/simulator` | Refactored: product_id dibaca client-side |
| 9 | `/voucher` | Static |
| 10 | `/login` | Static shell |
| 11 | `/tracking` | Static form |

**Dampak:** ~11 halaman high-traffic sekarang di-serve dari CDN tanpa function invocation.

### Estimasi Penghematan

| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Halaman server-render | ~28 | ~17 |
| Function invocations per page view | 1 | 0 (static) / 1 (dynamic) |
| Middleware runs per request | Semua | Hanya dynamic pages |
| **Estimasi Active CPU saving** | — | **~40-60%** |

### Estimasi Pemakaian CPU Setelah Optimasi

| Skenario | CPU/bulan (Sebelum) | CPU/bulan (Sesudah) |
|----------|---------------------|---------------------|
| Low traffic (20 pengunjung/hari) | ~3-5 jam | ~1-2 jam |
| Medium traffic (50 pengunjung/hari) | ~6-10 jam | ~2-4 jam |
| High traffic (100 pengunjung/hari) | ~13-20 jam | ~5-8 jam |

**Catatan:** Optimasi prerender sudah dilakukan, tapi limit 4 jam/bulan masih sangat ketat untuk e-commerce yang berkembang.

---

## Masalah Fundamental

### 1. Vercel Hobby = 4 Jam CPU/Bulan

4 jam = **240 menit** = **14,400 detik** CPU time.

Jika rata-rata page view butuh 200ms active CPU:

- 14,400 detik / 0.2 detik = **72,000 page views/bulan** (theoretical max)
- Realita: ~50-70% efficiency → **~36,000-50,000 page views/bulan**

Untuk toko online yang serius, ini **sangat terbatas**.

### 2. ToS Violation

Hobby plan **melarang penggunaan komersial**. Bukan soal teknis — ini masalah legal.

### 3. Skalabilitas

Saat traffic meningkat (flash sale, promosi, viral), CPU akan habis dalam hitungan hari.

---

## Opsi Solusi

### Opsi 1: Vercel Pro ($20/bulan) — REKOMENDASI

| Metrik | Hobby | Pro |
|--------|-------|-----|
| Active CPU | 4 jam/bulan | **48+ jam/bulan** |
| Provisioned Memory | 360 GB-hrs | **Lebih banyak** |
| Function Duration | 300s | **800s (configurable)** |
| Bandwidth | 100 GB | **1 TB** |
| Commercial Use | ❌ | ✅ |
| Support | — | Email support |

**Kelebihan:**

- Zero migration effort (tetap di Vercel)
- Limit naik 10-12x
- Komersial use allowed
- Function duration lebih lama (800s vs 300s)
- Support tersedia

**Kekurangan:**

- $20/bulan (masih sangat murah untuk toko online)
- Tetap ada batas (bukan unlimited)

### Opsi 2: VPS (Railway / Render / DigitalOcean)

| Platform | Harga | CPU | RAM | Bandwidth |
|----------|-------|-----|-----|-----------|
| Railway | $5-20/bulan | Shared-4 | 512MB-2GB | Unlimited |
| Render | $7-25/bulan | Shared | 512MB-2GB | Unlimited |
| DigitalOcean | $6-12/bulan | 1 vCPU | 1-2 GB | 1-2 TB |

**Kelebihan:**

- Dedicated resources (CPU tidak di-share)
- Bandwidth unlimited atau sangat besar
- Tidak ada function invocation limit
- Full control atas server
- Commercial use OK

**Kekurangan:**

- Butuh effort migrasi Astro SSR -> Node.js server
- Butuh setup server, monitoring, scaling
- Butuh technical expertise
- Maintenance burden

### Opsi 3: Hybrid (Vercel Pro + Cloudflare CDN)

- Vercel Pro untuk SSR + API
- Cloudflare CDN untuk static assets
- Mengurangi bandwidth usage di Vercel

**Kelebihan:**

- Static assets tidak menghitung bandwidth Vercel
- CDN global untuk performa
- Menghemat bandwidth Vercel

**Kekurangan:**

- Setup lebih kompleks
- $20/bulan + Cloudflare (gratis untuk basic)

---

## Rekomendasi Final

### Prioritas 1: Upgrade ke Vercel Pro ($20/bulan)

**Alasan:**

1. Solusi paling cepat (0 migration effort)
2. Limit naik 10-12x (dari 4 jam ke 48+ jam)
3. Komersial use allowed (sesuai ToS)
4. $20/bulan sangat worth untuk toko online
5. Function duration naik ke 800 detik

### Prioritas 2: Optimasi Lanjutan (Setelah Upgrade)

1. **ISR untuk `/products/[id]`** — Revalidasi setiap 15 menit
2. **Edge caching** untuk API responses
3. **Image optimization** — WebP, lazy load, Supabase Storage
4. **Database indexing** — Optimasi query performance
5. **Monitoring** — Setup usage alerts di Vercel dashboard

### Prioritas 3: Evaluasi Migrasi VPS (Jika Perlu)

Jika:

- Traffic melebihi 100 pengunjung/hari secara konsisten
- Butuh custom server logic (websockets, background jobs)
- Butuh lebih dari 1GB bandwidth/hari

Maka pertimbangkan migrasi ke VPS dengan:

- Astro SSR -> Node.js adapter
- Supabase tetap (hosted, tidak perlu migrasi)
- Deploy ke Railway/Render/DigitalOcean

---

## Monitoring & Alert

### Setup Usage Alerts

1. Login ke Vercel Dashboard
2. Project Settings -> Usage
3. Set alert thresholds:
   - **80%** Active CPU -> Warning email
   - **90%** Active CPU -> Urgent alert
   - **100%** Active CPU -> Critical (site berhenti)

### Checklist Setelah Upgrade

- [ ] Upgrade ke Vercel Pro
- [ ] Setup usage alerts (80%, 90%, 100%)
- [ ] Monitor CPU usage selama 1 minggu
- [ ] Evaluasi apakah perlu optimasi lebih lanjut
- [ ] Pertimbangkan ISR untuk product pages
- [ ] Setup image optimization pipeline

---

## Referensi

- [Vercel Hobby Plan Limits](https://vercel.com/docs/plans/hobby)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)
- [Fluid Compute Pricing](https://vercel.com/docs/functions/usage-and-pricing)
- [Vercel Pro Plan](https://vercel.com/docs/plans/pro-plan)

---

*Terakhir diperbarui: 18 Agustus 2026*
