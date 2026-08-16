# E2E Testing — BJS Express (Kurir Internal + Live Tracking)

Dokumen langkah-langkah lengkap untuk menguji alur **BJS Express** dari awal sampai selesai di **produksi**. Ikuti urutan sesuai bagian; centang tiap item di checklist bagian akhir.

---

## 1. Prasyarat & Lingkungan

| Item | Nilai |
|---|---|
| Store (toko pelanggan) | `https://bjsracing.com` |
| POS (admin) | `https://pos.bjsracing.com` |
| Aplikasi kurir | `https://bjsracing.com/kurir` |
| Tracking publik | `https://bjsracing.com/tracking/<nomor_order>` |
| Zona waktu | WIB (UTC+7) — semua jam layanan memakai WIB |
| Database | Supabase project `ykotzsmncvyfveypeevb` |

### Akun yang dibutuhkan
1. **Admin** — akun Supabase auth dengan `profiles.role = 'admin'` (dipakai login ke store & POS).
2. **Kurir** — akun Supabase auth dengan `profiles.role = 'courier'` (dibuat dari POS → Data Kurir, lihat langkah 2.2).
3. **Pelanggan test** — akun baru (register di `bjsracing.com`).

### ⚠️ Catatan penting sebelum mulai
- **Pembayaran Midtrans PRODUCTION** — `MIDTRANS_SERVER_KEY` berawalan `Mid-` (bukan `SB-Mid-`). Pembayaran real = uang asli. Gunakan order bernilai kecil, atau pakai **simulasi pembayaran tanpa uang** di langkah 3B.
- **WhatsApp Fonnte** — akun trial hanya bisa mengirim ke **nomor sendiri**. Untuk uji notif WA, isi nomor telepon pelanggan test dengan nomor pemilik.
- **Jam layanan** — opsi "BJS Express" di checkout hanya muncul jika waktu saat ini berada di antara `open_time`–`cutoff_time` area (default 08:00–15:00). **Set area uji ke 00:00–23:59** agar selalu muncul (langkah 2.1).
- Pastikan baris tabel `bjs_express_areas` dan `internal_shipping_zones` untuk kecamatan tujuan sudah **aktif**.

---

## 2. Persiapan

### 2.1 Buat area layanan BJS Express
1. Login admin ke `https://pos.bjsracing.com`.
2. Buka menu **Area Layanan** (BJS Express Areas).
3. Tambah area baru:
   - **Kecamatan (subdistrict)** — pilih kecamatan alamat tujuan test.
   - **Jam buka / tutup**: `00:00` / `23:59` (agar selalu tampil saat uji).
   - **Ongkir**: isi nilai test (mis. `10000`).
   - **ETD**: `6 - 8 Hours`.
   - **Maks berat (gram)**: `5000`.
   - **Nama layanan**: `BJS Express`.
4. Simpan, pastikan status **aktif**.

> Opsional verifikasi SQL:
> ```sql
> select id, subdistrict_id, district_name, shipping_cost, open_time, cutoff_time, max_weight_gram, is_active
> from bjs_express_areas order by created_at desc limit 5;
> ```

### 2.2 Buat akun kurir
1. POS → menu **Data Kurir**.
2. Klik **Tambah Kurir**, isi:
   - **Nama**: contoh `Kurir Test 1`
   - **Email** + **Password**: wajib diisi (ini kredensial login kurir)
   - **No. HP**, **Plat nomor**, **Tipe kendaraan** (default `motor`)
   - Status **Aktif** = aktif
3. Simpan → sistem otomatis membuat akun auth + `profiles.role = 'courier'`.
4. Verifikasi SQL:
   ```sql
   select c.id, c.name, c.phone, c.is_active, p.role
   from couriers c
   left join profiles p on p.id = c.user_id
   order by c.created_at desc limit 5;
   ```

### 2.3 Cek stok produk
- Catat `stok` dan `total_terjual` produk yang akan dibeli (untuk regresi di bagian 7):
  ```sql
  select id, kode, nama, stok, total_terjual from products where id = '<product_id>' or nama ilike '%<kata kunci>%';
  ```

---

## 3. Alur Checkout Pelanggan

1. Buka `https://bjsracing.com` di **jendela incognito** → register/login sebagai pelanggan test.
2. Tambahkan produk (stok cukup) ke keranjang → buka halaman **Keranjang** → **Checkout**.
3. Isi/aktifkan **alamat tujuan** di **kecamatan area BJS Express** (langkah 2.1).
4. Di pilihan **Jasa Kirim**, pastikan muncul opsi **"BJS Express: …"** dengan ongkir sesuai area.
   - Jika tidak muncul: cek jam layanan (00:00–23:59), status area aktif, kecamatan sudah benar.
5. Lanjut ke pembayaran → **catat nomor order** (format `BJS-YYYYMMDD-XXXXXX`).

### 3A. Bayar real (Midtrans production) — uang asli
1. Pilih metode pembayaran → lanjut ke halaman Midtrans Snap → selesaikan pembayaran.
2. Tunggu callback → status order menjadi `paid`.
3. Lewati 3B jika sudah memakai cara ini.

### 3B. Simulasi pembayaran (tanpa uang) — direkomendasikan untuk uji
1. Ambil `order_id` (UUID): buka halaman `https://bjsracing.com/akun/pesanan/<order_id>` milik pelanggan test — UUID ada di URL (bagian setelah `/akun/pesanan/`).
2. Login ke `bjsracing.com` sebagai **admin** (harus role admin; sesi dipakai untuk otentikasi endpoint).
3. Buka DevTools (F12) → tab **Console** → jalankan:
   ```js
   const r = await fetch('/api/payment/confirm', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ order_id: '<order_id>' }),
   });
   console.log(r.status, await r.json());
   ```
4. Respons sukses: `{"status":"paid"}`. Ini menjalankan `confirmOrderPayment` yang sama seperti webhook: order → `paid`, stok −qty (log `reserve`), notif WA `payment_confirmed`, tanpa booking Biteship (kode `internal` di-skip).

### Verifikasi setelah pembayaran
```sql
select order_number, status, total_amount, courier_details->>'code' as courier_code,
       courier_details->>'shipping_status' as shipping_status
from orders where order_number = '<nomor_order>';

select product_id, perubahan, type, keterangan, created_at
from stock_logs where keterangan like '%<nomor_order>%' order by created_at desc;
```
- Status order = `paid`, log stok type `reserve` dengan `perubahan` = −qty.

---

## 4. Penugasan Kurir (Admin POS)

1. Buka `https://pos.bjsracing.com` → tab **Penugasan** (BJS Express).
2. Pastikan order (status `paid`) muncul di daftar.
3. Klik **Tugaskan** → pilih kurir (aktif) → simpan.
4. Yang terjadi otomatis:
   - `courier_assignments` dibuat/update (1 per order, status `assigned`).
   - Event `assigned` dicatat di `courier_assignment_events`.
   - Order → `shipped`, `courier_details.shipping_status` = `assigned` + `courier_name`.
   - WA `order_shipped` terkirim ke nomor pelanggan berisi **nama kurir + link tracking**.

### Verifikasi
```sql
select o.order_number, o.status, o.courier_details->>'shipping_status',
       ca.id as assignment_id, ca.status as assign_status, c.name as kurir
from orders o
join courier_assignments ca on ca.order_id = o.id
join couriers c on c.id = ca.courier_id
where o.order_number = '<nomor_order>';

select status, note, created_at from courier_assignment_events
where assignment_id = '<assignment_id>' order by created_at;
```

---

## 5. Aplikasi Kurir (`bjsracing.com/kurir`)

1. Buka `https://bjsracing.com/kurir` di **browser berbeda / incognito** → login dengan akun kurir (email+password dari 2.2).
   - Salah role (mis. pelanggan) → otomatis diarahkan ke `/`.
2. Lihat daftar **penugasan** → buka detail assignment (peta + rute + info pelanggan).
3. **Izinkan akses lokasi** saat diminta (untuk live tracking).

### Urutan status (tombol berubah sesuai status)
| Tombol | Status baru |
|---|---|
| **Ambil Barang** | `picked` |
| **Mulai Antar** | `in_transit` |
| **Tiba di Lokasi** | `dropping_off` |
| **Tandai Selesai** | `completed` |

4. Klik **Ambil Barang** → verifikasi:
   - Event `picked` masuk timeline.
   - `orders.courier_details.shipping_status` = `picked`.
5. Klik **Mulai Antar** → **Tiba di Lokasi** → verifikasi event tiap langkah.
6. **Tandai Selesai**:
   - **Upload foto bukti** (wajib) → tersimpan ke bucket `bukti-pengiriman`, `photo_url` tersimpan.
   - Setelah selesai: order → `completed` + `delivered_at` terisi; WA `order_completed` terkirim (dengan link tracking).
   - **Stok tidak berkurang lagi** (karena sudah potong via `reserve`) — lihat bagian 7.
7. Setelah `completed`, penugasan terkunci (tombol tidak ada lagi).

### Live tracking (uji di langkah 6)
- Di detail assignment, aktifkan toggle **Live Tracking**.
- Aplikasi mengirim lokasi setiap ±5 detik (throttle ±15 menit) ke `/api/kurir/assignments/<id>/location`.

### Verifikasi
```sql
select status, note, created_at from courier_assignment_events
where assignment_id = '<assignment_id>' order by created_at;

select id, latitude, longitude, created_at from courier_locations
where assignment_id = '<assignment_id>' order by created_at desc limit 5;
```

---

## 6. Tracking Pelanggan + Realtime

### 6.1 Tracking publik (anonim)
1. Buka link tracking dari WA / langsung: `https://bjsracing.com/tracking/<nomor_order>` di browser biasa (tanpa login).
2. Periksa: status order, **timeline** (assigned → picked → in_transit → dropping_off → completed), **foto bukti**, detail pesanan.
3. Saat kurir aktif mengirim lokasi → **marker kurir hijau** + garis rute (polyline) kurir → tujuan, badge **Live** + timestamp.

### 6.2 Uji realtime
1. Di browser kurir: aktifkan **Live Tracking** di detail assignment.
2. Di browser pelanggan: buka halaman tracking (6.1) secara bersamaan.
3. Pindahkan/menyalakan lokasi kurir (atau tunggu update) → marker di halaman pelanggan **bergerak otomatis tanpa refresh** (subscription realtime Supabase).

### 6.3 Tracking dari akun
1. Login pelanggan di `bjsracing.com` → menu **Akun** → **Pesanan** → buka detail order.
2. Pastikan status menampilkan **"Selesai"** setelah kurir menandai completed.

---

## 7. Regresi Stok (fix `online_sale`)

Tujuan: memastikan **tidak ada double-decrement** untuk pesanan online BJS Express.

| Fase | `stok` | `total_terjual` |
|---|---|---|
| Sebelum order | nilai awal (catat) | nilai awal (catat) |
| Setelah bayar (paid) | **berkurang −qty** (log `reserve`) | tetap |
| Setelah kurir selesai (completed) | **tetap** | **bertambah +qty** (log `online_sale`) |

1. Ambil stok sebelum (lihat 2.3), order beli `qty` unit.
2. Bayar (3A/3B) → cek stok = stok_awal − qty.
3. Selesaikan pengiriman (bagian 5) → cek:
   ```sql
   select product_id, perubahan, type, keterangan, created_at
   from stock_logs
   where keterangan like '%<nomor_order>%' order by created_at;
   ```
   Harus ada **dua baris** per produk: `reserve` (−qty) lalu `online_sale` (−qty). `stok` hanya terpengaruh baris `reserve`.
4. Verifikasi `stok` & `total_terjual` final:
   ```sql
   select id, kode, nama, stok, total_terjual from products where id = '<product_id>';
   ```
   - `stok` = stok_awal − qty (hanya sekali potong).
   - `total_terjual` = awal + qty.
5. Cek di POS → **Riwayat Stok**: log menampilkan perubahan −qty dengan keterangan order tsb.

> Jalur lain yang setara: konfirmasi kirim dari admin store (`/api/admin/orders/[id]/deliver`) dan webhook Biteship — keduanya memakai `online_sale`.

---

## 8. Skenario Tambahan (opsional)

1. **Ganti kurir (reassign)** — di POS tab Penugasan, tugaskan ulang order yang sudah `shipped` ke kurir lain → assignment di-*upsert* ke kurir baru, `courier_details.courier_name` ikut berubah, event `assigned` baru tercatat.
2. **Kurir batalkan** — tambah endpoint/test `status: cancelled` di app kurir → order tetap `shipped`; admin bisa reassign. (Belum ada tombol di UI; verifikasi via API/sesi kurir.)
3. **Luar area / overweight** — checkout ke kecamatan yang **tidak** ada di `bjs_express_areas`, atau berat melebihi `max_weight_gram` → opsi BJS Express **tidak muncul**.
4. **Di luar jam layanan** — set `open_time`/`cutoff_time` tidak mencakup waktu sekarang → opsi BJS Express tidak muncul (jika memakai jam uji).
5. **Order Biteship normal** — order dengan kurir eksternal (gojek/jne/dll) → tracking waybill biasa tetap berfungsi, tidak terpengaruh modul internal.

---

## 9. Checklist

| No | Fase | Langkah | Hasil (✓) |
|---|---|---|---|
| 1 | Persiapan | Area layanan aktif 00:00–23:59 | |
| 2 | Persiapan | Akun kurir dibuat (role courier) | |
| 3 | Checkout | Opsi "BJS Express" muncul + ongkir benar | |
| 4 | Pembayaran | Order `paid` (real/simulasi) + stok −qty `reserve` | |
| 5 | Penugasan | Order `shipped`, WA `order_shipped`, event `assigned` | |
| 6 | Kurir | Login `/kurir`, step `picked` → `in_transit` → `dropping_off` → `completed` | |
| 7 | Kurir | Foto bukti tersimpan (`bukti-pengiriman`) | |
| 8 | Kurir | Order `completed` + `delivered_at` + WA `order_completed` | |
| 9 | Tracking | `/tracking/<nomor_order>` menampilkan timeline + foto | |
| 10 | Realtime | Marker kurir bergerak live tanpa refresh | |
| 11 | Stok | Tidak ada double-decrement; `total_terjual` +qty setelah selesai | |
| 12 | Akun | Detail order pelanggan menampilkan "Selesai" | |

---

## 10. Cara Ambil Data Pendukung Cepat

- Nomor order terbaru:
  ```sql
  select order_number, status, created_at from orders order by created_at desc limit 5;
  ```
- Order BJS Express terbaru + assignment:
  ```sql
  select o.order_number, o.status, c.name as kurir, ca.status as penugasan
  from orders o
  left join courier_assignments ca on ca.order_id = o.id
  left join couriers c on c.id = ca.courier_id
  where o.courier_details->>'code' = 'internal'
  order by o.created_at desc limit 10;
  ```
- Lokasi realtime terbaru:
  ```sql
  select cl.latitude, cl.longitude, cl.created_at, o.order_number
  from courier_locations cl
  join courier_assignments ca on ca.id = cl.assignment_id
  join orders o on o.id = ca.order_id
  order by cl.created_at desc limit 5;
  ```

> Setelah semua checklist tercentang, alur BJS Express dinyatakan lolos uji end-to-end.
