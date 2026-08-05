**Tabel `products` memiliki 42 kolom.**

## Kolom Lengkap

| # | Kolom | Tipe (kemungkinan) | Keterangan |
|---|-------|-------------------|------------|
| 1 | `id` | `uuid` | Primary key |
| 2 | `kode` | `text` | Kode produk |
| 3 | `nama` | `text` | Nama produk |
| 4 | `kategori` | `text` | Kategori (Pilok, dll) |
| 5 | `harga_beli` | `numeric` | Harga beli |
| 6 | `harga_jual` | `numeric` | Harga jual |
| 7 | `stok` | `integer` | Stok |
| 8 | `stok_min` | `integer` | Stok minimum |
| 9 | `supplier` | `text` | Nama supplier |
| 10 | `created_at` | `timestamptz` | Waktu dibuat |
| 11 | `status` | `text` | Aktif / Diarsipkan |
| 12 | `merek` | `text` | Merek (Samurai, dll) |
| 13 | `updated_at` | `timestamptz` | Waktu diupdate |
| 14 | `catatan` | `text` | Catatan |
| 15 | `supplier_id` | `uuid` | FK ke suppliers |
| 16 | `satuan_dasar` | `text` | Satuan dasar |
| 17 | `satuan_pembelian` | `text` | Satuan pembelian |
| 18 | `nilai_konversi` | `numeric` | Nilai konversi satuan |
| 19 | `harga_grosir` | `numeric` | Harga grosir |
| 20 | `ukuran` | `text` | Ukuran |
| 21 | `stok_dialokasikan` | `integer` | Stok dialokasikan |
| 22 | `image_url` | `text` | URL gambar utama |
| 23 | `color_swatch_url` | `text` | URL swatch warna |
| 24 | `specifications` | `jsonb` | Spesifikasi |
| 25 | `color_variant` | `text` | Varian warna |
| 26 | `sku` | `text` | SKU |
| 27 | `lini_produk` | `text` | Lini produk |
| 28 | `harga_coret` | `numeric` | Harga coret |
| 29 | `total_terjual` | `integer` | Total penjualan |
| 30 | `rating` | `numeric` | Rating |
| 31 | `jumlah_ulasan` | `integer` | Jumlah ulasan |
| 32 | `color_hex` | `text` | Kode hex warna |
| 33 | `berat_gram` | `integer` | Berat (gram) |
| 34 | `tags` | `text[]` | Tags |
| 35 | `group_id` | `uuid` | Grup varian |
| 36 | `image_url_2` | `text` | URL gambar 2 |
| 37 | `image_url_3` | `text` | URL gambar 3 |
| 38 | `is_master` | `boolean` | Apakah master varian |
| 39 | `variant_label` | `text` | Label varian |
| 40 | `panjang_cm` | `numeric(6,2)` | Panjang (cm) |
| 41 | `lebar_cm` | `numeric(6,2)` | Lebar (cm) |
| 42 | `tinggi_cm` | `numeric(6,2)` | Tinggi (cm) |

Sumber: query `SELECT * FROM products LIMIT 1` via PostgREST API, dikombinasi dengan definisi TypeScript di `src/lib/store.ts` dan migrasi SQL di `supabase/migrations/`.