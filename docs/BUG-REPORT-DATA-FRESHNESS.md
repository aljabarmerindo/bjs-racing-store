# Bug Report: Data Freshness Issues

**Tanggal:** 19 Agustus 2026  
**Status:** ✅ DIPERBAIKI (Commit: 8038225)  
**Terpicu oleh:** Optimasi Fluid Active CPU (prerender = true)

---

## Ringkasan

Setelah mengaktifkan `prerender = true` pada 11 halaman statis untuk mengurangi penggunaan Vercel Fluid Active CPU, ditemukan beberapa bug terkait data yang stale (usang). Halaman yang diprerender menyimpan data dari build time, tetapi komponen React di dalamnya melakukan fetch data baru di client-side. Perbedaan ini menyebabkan masalah:
- Indeks array out-of-bounds
- Harga/stock tidak ter-update
- Animasi counter tidak re-trigger
- Harga checkout tidak divalidasi server-side

---

## Daftar Bug & Perbaikan

### 1. PromoBanner — Index Out-of-Bounds Crash (KRITIS)

**File:** `src/components/PromoBanner.tsx`  
**Masalah:** Jika fresh fetch mengembalikan fewer slides daripada yang diprerender, dan user sudah advance ke slide ke-3, `slides[index]` menjadi `undefined` → crash.  
**Fix:** Tambah `useEffect` untuk clamp index saat slides array berubah:
```tsx
useEffect(() => {
  setIndex((prev) => (prev >= slides.length ? 0 : prev));
}, [slides.length]);
```

---

### 2. StatsCounter — Animasi ke Nilai Stale (MODERATE)

**File:** `src/components/StatsCounter.tsx`  
**Masalah:** `animate()` menggunakan closure `endValue` dari waktu pertama dipanggil. Jika fresh data sampai mid-animation, counter tetap animate ke nilai LAMA. Setelah `hasAnimated = true`, tidak ada re-animation.  
**Fix:**
1. Tambah `endValueRef` untuk selalu baca nilai terbaru
2. Update `animate()` callback untuk pakai ref
3. Tambah `useEffect` untuk re-animate saat value berubah signifikan

---

### 3. supabaseBrowserClient — Proxy Binding Issues (MODERATE)

**File:** `src/lib/supabaseBrowserClient.ts`  
**Masalah:** Destructured methods (`const { from } = supabase`) kehilangan `this` binding.  
**Fix:** Tambah `value.bind(client)` di Proxy handler:
```tsx
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
```

---

### 4. create-transaction — Harga Tidak Divalidasi Server-Side (KRITIS)

**File:** `src/pages/api/payment/create-transaction.ts`  
**Masalah:** Server validasi stock (409 jika habis), tapi tidak validasi harga. Jika admin ubah harga dari Rp 50.000 ke Rp 60.000, tapi cart user masih Rp 50.000, order akan dibuat dengan harga LAMA.  
**Dampak:** User bisa bayar salah harga, order items menyimpan harga dari frontend, subtotal/total/payment fee semuanya salah.  
**Fix:**
1. Update query untuk ambil `harga_jual`
2. Override harga dari DB setelah validasi stok
3. Recalculate subtotal setelah override

---

### 5. FlashSaleSection — Stock Stale (TINGGI)

**File:** `src/components/FlashSaleSection.jsx`  
**Masalah:** Fetch sekali saat mount, tidak ada re-fetch. Stock `stock_allocated` bisa habis (0) tapi masih tampil "Tersedia".  
**Fix:**
1. Tambah `setInterval` 60 detik untuk periodic refresh
2. Re-fetch saat countdown expires

---

### 6. FeaturedProducts — Harga/Stock Stale (TINGGI)

**File:** `src/components/FeaturedProducts.jsx`  
**Masalah:** Fetch sekali saat tab dipilih. Harga dan stock bisa berubah setelah fetch.  
**Fix:**
1. Tambah `setInterval` 5 menit untuk periodic refresh
2. Re-fetch saat tab kembali visible (`visibilitychange` event)

---

### 7. ProductDetailView — Harga/Stock Stale (TINGGI)

**File:** `src/components/ProductDetailView.jsx`  
**Masalah:** SSR data fresh saat page load, tapi setelah itu tidak refresh. User bisa tambahkan item out-of-stock ke cart.  
**Fix:** Tambah `setInterval` 30 detik untuk refresh stock/price dari Supabase.

---

### 8. OnderdilDetailView — Harga/Stock Stale (TINGGI)

**File:** `src/components/OnderdilDetailView.jsx`  
**Masalah:** Sama seperti ProductDetailView — SSR data fresh, tapi tidak refresh setelah page load.  
**Fix:** Tambah `setInterval` 30 detik untuk refresh stock/price dari Supabase.

---

### 9. CategoriesPreview — Hardcoded Count (RENDAH)

**File:** `src/components/CategoriesPreview.jsx`  
**Masalah:** Jumlah produk "120" di-hardcode, tidak dari database.  
**Fix:** Tambah `useEffect` untuk fetch count dari Supabase.

---

## Statistik Perbaikan

| Metrik | Nilai |
|--------|-------|
| Total bug diperbaiki | 9 |
| KRITIS | 2 (PromoBanner crash, Price validation) |
| TINGGI | 4 (FlashSale, FeaturedProducts, ProductDetail, OnderdilDetail) |
| MODERATE | 2 (StatsCounter, Proxy binding) |
| RENDAH | 1 (CategoriesPreview) |
| File yang diubah | 10 |
| Total baris ditambah | ~452 |
| Waktu implementasi | ~45 menit |

---

## Commit Details

```
Commit: 8038225
Message: fix: data freshness bugs - server-side price validation, periodic refresh, index guard, proxy binding
Files changed: 10
Insertions: 452
Deletions: 11
```

---

## Testing Checklist

- [ ] PromoBanner: deploy dengan 5 promo, expire 3 promo, cek tidak crash
- [ ] StatsCounter: deploy dengan totalTerjual = 50, update ke 150, cek counter update
- [ ] supabaseBrowserClient: test destructuring `const { from } = supabase`
- [ ] create-transaction: ubah harga di POS, cek checkout pakai harga DB
- [ ] FlashSaleSection: tunggu stock habis, cek item hilang dari list
- [ ] FeaturedProducts: ubah harga/stock, cek update setelah 5 menit
- [ ] ProductDetailView: buka produk, ubah stock di POS, cek update
- [ ] OnderdilDetailView: buka onderdil, ubah stock di POS, cek update

---

## Catatan

- Build-time queries di `index.astro` TIDAK bisa dihapus untuk SEO (Google crawler butuh data)
- `client:visible` components (BrandMarquee) butuh build-time data karena hydrate lambat
- Periodic refresh tidak menambah signifikan CPU usage (hanya fetch kecil)
- Server-side price validation adalah fix paling kritis untuk mencegah kerugian finansial
