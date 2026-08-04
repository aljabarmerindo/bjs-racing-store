-- File: supabase/migrations/2026_08_04_add_product_dimensions.sql
-- Menambah kolom dimensi produk (cm) untuk integrasi berat volumetrik Biteship.
-- Semua produk lama otomatis diisi 10 (default), dapat direvisi per produk via POS.

alter table public.products
  add column if not exists panjang_cm numeric(6,2) not null default 10,
  add column if not exists lebar_cm numeric(6,2) not null default 10,
  add column if not exists tinggi_cm numeric(6,2) not null default 10;