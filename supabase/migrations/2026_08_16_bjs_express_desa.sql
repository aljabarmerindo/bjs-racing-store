-- Migrasi: tarif BJS Express per desa/kelurahan
-- Diterapkan ke project Supabase (jalankan di SQL editor / supabase db).

-- 1) bjs_express_areas: kolom desa/kelurahan
--    NULL / kosong = berlaku untuk semua desa di kecamatan (harga default)
alter table public.bjs_express_areas
  add column if not exists village_name text;

-- 2) customer_addresses: simpan desa/kelurahan yang dipilih pelanggan
alter table public.customer_addresses
  add column if not exists village_name text;

-- 3) Unique index: satu harga per (kecamatan, desa) & satu default per kecamatan
create unique index if not exists uq_bjs_express_areas_subdistrict_village
  on public.bjs_express_areas (subdistrict_id, village_name)
  where village_name is not null;

create unique index if not exists uq_bjs_express_areas_subdistrict_all
  on public.bjs_express_areas (subdistrict_id)
  where village_name is null;
