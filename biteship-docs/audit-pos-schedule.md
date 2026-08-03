# Audit: Manajemen Jam Operasional Kurir — Sistem POS

**Catatan dari Pemilik:**
- Manajemen schedule dilakukan langsung di Vercel production, bukan via localhost dev (Express server).
- BJS Express adalah kurir internal (instant). POS Indonesia, JNE, J&T Express, J&T Cargo adalah **non-instant courier** — mereka **tidak memerlukan** `open_time`/`cutoff_time` karena order bisa dipick-up dan dikirim hari esok, meskipun customer order di malam hari.
- Kurir yang digunakan: GOJEK, POS Indonesia, JNE, J&T Express, J&T Cargo, BJS Express. **SiCepat dihapus** dari sistem.

---

## Ringkasan Arsitektur

```
Sistem POS (/workspaces/bjs-racing-pos/)
├── src/pages/
│   ├── GojekAreas.jsx          # CRUD area GOJEK + schedule
│   └── BjsExpressAreas.jsx     # CRUD area BJS Express + schedule
├── api/shipping/
│   ├── courier-config.js       # GET schedule untuk checkout
│   └── biteship/
│       ├── gojek-areas.js      # CRUD area GOJEK
│       └── bjs-express-areas.js # CRUD area BJS Express
├── server.js                   # Express backend (alternatif Vercel)
└── supabase/migrations/
    └── 20260728000000_add_courier_schedule.sql  # Tambah kolom schedule
```

**Database:**
- `gojek_service_areas` — `open_time` (default 08:00), `cutoff_time` (default 18:00)
- `bjs_express_areas` — `open_time` (default 08:00), `cutoff_time` (default 15:00)
- **Tidak ada tabel schedule untuk POS, JNE, JNT, JNT Cargo**

---

## 🟡 Bug Sedang

### BUG-1: Express Server (`server.js`) Tidak Menyimpan `open_time`/`cutoff_time`

**Lokasi:** `server.js` baris 207–214 (GOJEK POST), 229–233 (GOJEK PUT), 280–295 (BJS POST), 310–314 (BJS PUT)

Express server adalah backend alternatif untuk local development/self-hosted. Pada POST dan PUT handlers untuk `gojek_service_areas` dan `bjs_express_areas`, kolom `open_time` dan `cutoff_time` **tidak disertakan** dalam operasi insert/update.

```javascript
// server.js — POST gojek-areas (baris 207–214)
const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active } = body;
// ↑ open_time dan cutoff_time tidak di-extract dari body

// server.js — PUT gojek-areas/:id (baris 229–233)
const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active } = body;
// ↑ open_time dan cutoff_time tidak di-update

// Sama untuk bjs-express-areas POST (280–295) dan PUT (310–314)
```

**Dampak:**
- Jika developer menggunakan Express server di local development dan mengubah schedule, perubahan **tidak tersimpan**
- Kolom `open_time`/`cutoff_time` revert ke default database (08:00 / 18:00 untuk GOJEK, 08:00 / 15:00 untuk BJS Express)
- **Catatan:** Manajemen schedule di production menggunakan Vercel serverless functions yang sudah menyimpan schedule dengan benar.

**Rekomendasi:**
- Tambahkan `open_time` dan `cutoff_time` ke destructuring body di semua POST/PUT handlers di `server.js`
- Tambahkan validation bahwa `open_time` < `cutoff_time`

---

### BUG-2: `Pos.jsx` (Checkout) Menggunakan Hardcoded Cutoff, Bukan dari Database

**Lokasi:** `src/pages/Pos.jsx` baris 794–805

Checkout flow menggunakan nilai hardcoded untuk cutoff time, bukan mengambil dari API `courier-config`:

```javascript
const gojekCutoff = 18 * 60;   // 18:00 WIB — hardcoded
const bjsCutoff = 15 * 60;     // 15:00 WIB — hardcoded

const filtered = services.filter((s) => {
  if (s.code === "gojek" && jakartaTime >= gojekCutoff) return false;
  if (s.code === "internal" && jakartaTime >= bjsCutoff) return false;
  return true;
});
```

**Dampak:**
- Jika admin mengubah cutoff time di halaman manajemen area (misal GOJEK jadi 20:00), **perubahan tidak berdampak** ke checkout
- Checkout tetap menggunakan nilai hardcoded (18:00 untuk GOJEK, 15:00 untuk BJS Express)
- Manajemen schedule terputus dari checkout flow

**Rekomendasi:**
- Ganti hardcoded values dengan fetch ke `/api/shipping/courier-config` saat app load
- Simpan schedule di state/context dan gunakan untuk filter

---

### BUG-3: `courier-config.js` Hanya Mengembalikan Schedule GOJEK dan BJS Express

**Lokasi:** `api/shipping/courier-config.js`

Endpoint hanya query `gojek_service_areas` dan `bjs_express_areas`. Tidak ada schedule untuk POS, JNE, JNT, JNT Cargo.

```javascript
// api/shipping/courier-config.js
const [gojekResult, bjsResult] = await Promise.all([
  supabaseAdmin.from("gojek_service_areas").select("open_time, cutoff_time, is_active").eq("is_active", true).limit(1),
  supabaseAdmin.from("bjs_express_areas").select("open_time, cutoff_time, is_active").eq("is_active", true).limit(1),
]);
```

**Klarifikasi dari Pemilik:**
- GOJEK adalah kurir **instant** — memerlukan `open_time`/`cutoff_time` karena order harus diproses dan dikirim dalam hari yang sama.
- BJS Express adalah kurir **internal** (instant) — juga memerlukan schedule.
- POS Indonesia, JNE, J&T Express, J&T Cargo adalah **non-instant courier** — mereka **tidak memerlukan** schedule `open_time`/`cutoff_time`. Order bisa dipick-up dan dikirim hari esok, meskipun customer order di malam hari.

**Kesimpulan:** Hanya GOJEK dan BJS Express yang memerlukan schedule. Untuk kurir non-instant, schedule tidak diperlukan.

**Dampak:**
- `courier-config.js` hanya return schedule untuk kurir yang membutuhkan (GOJEK & BJS Express) — ini sebenarnya **benar**
- Yang salah adalah di `bjs-racing-store` checkout, kurir non-instant (POS/JNE/JNT/JNT Cargo) **tersalah difilter** menggunakan schedule GOJEK

---

### BUG-4: `.limit(1)` — Hanya Membaca Satu Area Per Kurir

**Lokasi:** `api/shipping/courier-config.js` baris 9 dan 15

Query menggunakan `.limit(1)`, yang berarti **hanya 1 record area** yang aktif dibaca per kurir.

**Penjelasan detail:**
Di database `gojek_service_areas` bisa ada **multiple area** dengan schedule berbeda. Contoh:

| id | district_name | city_name | is_active | open_time | cutoff_time |
|----|---------------|-----------|-----------|-----------|-------------|
| 1 | Semarang Tengah | Semarang | true | 08:00 | 18:00 |
| 2 | Semarang Selatan | Semarang | true | 10:00 | 20:00 |

Dengan `.limit(1)`, query hanya mengambil record pertama (id=1, schedule 08:00–18:00). Record kedua (id=2, schedule 10:00–20:00) **tidak pernah dibaca**.

**Dampak:**
- Jika ada multiple area dengan schedule berbeda, **hanya schedule area pertama** yang digunakan untuk seluruh checkout flow
- Customer di area dengan schedule berbeda (misal cutoff 20:00) akan melihat cutoff yang salah (18:00)
- Admin tidak bisa mengatur schedule berbeda per-area

**Rekomendasi:**
- Tentukan strategy: satu schedule global per kurir, atau per-area schedule
- Jika per-area, checkout perlu menentukan area customer terlebih dahulu sebelum apply schedule
- Jika global, buat tabel terpisah `courier_schedules` dengan satu record per kurir

---

### BUG-5: Inconsistent Courier Lists di Seluruh Codebase

**Lokasi:** Berbagai file

| File | Default Couriers |
|------|-----------------|
| `src/lib/biteshipClient.js` line 26 | `gojek,pos,jne,jnt,sicepat` ❌ (masih pakai sicepat) |
| `api/shipping/biteship/rates.js` line 39 | `gojek,pos,jne,jnt,jntcargo` ✅ |
| `server.js` line 92 | `gojek,pos,jne,jnt,jntcargo` ✅ |
| `src/pages/Pos.jsx` line 744 | `gojek` (coords) + `pos,jne,jnt,jntcargo` (postal) ✅ |

**Masalah:**
- `biteshipClient.js` masih menggunakan `sicepat` yang **sudah tidak dipakai**
- `biteshipClient.js` tidak include `jntcargo` yang seharusnya ada
- Inkonsistensi bisa menyebabkan kurir hilang atau muncul tidak terduga

**Rekomendasi:** Update `biteshipClient.js` untuk menggunakan `jntcargo` dan menghapus `sicepat`.

---

### BUG-6: Tidak Ada Validasi `open_time` < `cutoff_time`

**Lokasi:** `GojekAreas.jsx`, `BjsExpressAreas.jsx`, API endpoints

Tidak ada validasi bahwa `open_time` harus lebih kecil dari `cutoff_time`. Admin bisa menyet:

- `open_time: 23:00`, `cutoff_time: 08:00` (cutoff sebelum open)
- `open_time: 18:00`, `cutoff_time: 18:00` (tidak ada jam operasional)

**Dampak:**
- Schedule invalid bisa menyebabkan kurir selalu ditutup atau selalu buka
- Tidak ada feedback ke admin jika input tidak valid

---

## 🟢 Bug Kecil

### BUG-7: Tidak Ada Scheduling Berdasarkan Hari

Schedule hanya menyimpan `open_time` dan `cutoff_time` tanpa hari. Semua hari menggunakan schedule yang sama.

**Dampak:**
- Tidak bisa mengatur jam operasional berbeda untuk Minggu/libur
- Kurir mungkin ditampilkan sebagai buka meskipun hari libur

---

### BUG-8: BJS Express Cutoff 15:00 vs GOJEK 18:00 — Tidak Ada Penjelasan

BJS Express default cutoff 15:00 (3 jam lebih cepat dari GOJEK 18:00). Tidak ada dokumentasi atau UI explanation mengapa perbedaan ini ada.

---

## ⚠️ Gaps Arsitektural

### GAP-1: ✅ FIXED — Kurir Non-Instant (POS/JNE/JNT/JNT Cargo) Tidak Perlu Schedule

**Perbaikan yang Diterapkan:**

Di `bjs-racing-store/src/components/CheckoutView.tsx`, tiga fungsi diperbaiki untuk kurir non-instant:

1. **`isWithinSchedule()`** — sekarang return `true` untuk `pos`, `jne`, `jnt`, `jntcargo` (always available)
2. **`getScheduleLabel()`** — sekarang return `""` untuk kurir non-instant (tidak menampilkan label schedule yang menyesatkan)
3. **`getScheduleReason()`** — sekarang return `""` untuk kurir non-instant (tidak menampilkan alasan "sudah tutup")

**Kode perbaikan:**
```typescript
const normalized = String(code || "").toLowerCase();
if (["pos", "jne", "jnt", "jntcargo"].includes(normalized)) return true; // isWithinSchedule
if (["pos", "jne", "jnt", "jntcargo"].includes(normalized)) return "";  // getScheduleLabel / getScheduleReason
```

**Dampak:**
- POS/JNE/JNT/JNT Cargo **selalu tersedia** di checkout, 24/7
- Tidak ada label schedule yang menyesatkan ("08:00 - 18:00 WIB")
- GOJEK dan BJS Express tetap menggunakan schedule respective mereka

---

### GAP-2: Dua Backend Berjalan Paralel (Vercel vs Express)

Ada dua backend systems yang berjalan paralel:
1. **Vercel serverless** (`api/shipping/`) — production, fully featured
2. **Express server** (`server.js`) — local dev/self-hosted, **tidak menyimpan schedule**

Ini menyebabkan inkonsistensi antara development dan production. Developer menggunakan Express di local, tetapi schedule changes tidak tersimpan.

---

### GAP-3: Schedule Disimpan per-Area, Bukan Global

Schedule disimpan di tabel area (`gojek_service_areas`, `bjs_express_areas`), bukan sebagai config global. Ini bermasalah jika:
- Ada multiple area dengan schedule berbeda
- Admin perlu mengubah schedule untuk seluruh area (harus update satu per satu)

---

## 📊 Ringkasan Prioritas

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | 🟡 Medium | Express server tidak menyimpan `open_time`/`cutoff_time` | `server.js` |
| 2 | 🟡 Medium | Checkout POS menggunakan hardcoded cutoff, bukan dari database | `Pos.jsx` |
| 3 | ℹ️ Info | `courier-config.js` hanya return schedule GOJEK & BJS Express (benar, kurir lain non-instant) | `courier-config.js` |
| 4 | 🟡 Medium | `.limit(1)` — hanya baca satu area per kurir | `courier-config.js` |
| 5 | 🟡 Medium | `biteshipClient.js` masih pakai `sicepat`, harus diganti `jntcargo` | `biteshipClient.js` |
| 6 | 🟡 Medium | Tidak ada validasi `open_time` < `cutoff_time` | Admin pages |
| 7 | 🟢 Minor | Tidak ada scheduling berdasarkan hari | All schedule files |
| 8 | 🟢 Minor | BJS Express cutoff 15:00 tanpa penjelasan | `BjsExpressAreas.jsx` |
| GAP-1 | ✅ Fixed | Kurir non-instant (POS/JNE/JNT/JNT Cargo) selalu available — tidak difilter schedule | `CheckoutView.tsx` |
| GAP-2 | 🟡 Medium | Dua backend paralel dengan fitur berbeda | `server.js` vs `api/` |
| GAP-3 | 🟡 Medium | Schedule per-area bukan global | Database schema |

---

## 📎 Referensi

- `api/shipping/courier-config.js` — Endpoint schedule config
- `src/pages/GojekAreas.jsx` — Manajemen area GOJEK
- `src/pages/BjsExpressAreas.jsx` — Manajemen area BJS Express
- `server.js` — Express backend (lines 207–314)
- `src/pages/Pos.jsx` — Checkout dengan hardcoded cutoff (lines 794–805)
- `supabase/migrations/20260728000000_add_courier_schedule.sql` — Migration schedule columns

---

*Laporan audit ini dibuat berdasarkan analisis kode sumber sistem POS. Temuan ini perlu diverifikasi oleh tim pengembang sebelum implementasi perbaikan.*
