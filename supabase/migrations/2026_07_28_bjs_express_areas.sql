-- Migrasi: tabel area layanan kurir internal BJS Express
-- Diterapkan ke project Supabase (jalankan di SQL editor / supabase db).

create table if not exists public.bjs_express_areas (
  id uuid primary key default gen_random_uuid(),
  subdistrict_id text not null,
  district_name text not null,
  city_name text not null,
  province_name text not null,
  postal_code text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index untuk lookup cepat berdasarkan subdistrict_id
create index if not exists idx_bjs_express_areas_subdistrict on public.bjs_express_areas(subdistrict_id);

-- Index untuk lookup berdasarkan is_active
create index if not exists idx_bjs_express_areas_active on public.bjs_express_areas(is_active);

-- Trigger auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_bjs_express_areas_updated_at on public.bjs_express_areas;
create trigger trigger_bjs_express_areas_updated_at
  before update on public.bjs_express_areas
  for each row
  execute function public.update_updated_at_column();

-- Seed data: semua desa/kelurahan di Kecamatan Bangsri, Jepara
insert into public.bjs_express_areas (subdistrict_id, district_name, city_name, province_name, postal_code, is_active) values
  ('IDNP10IDNC157IDND1006IDZ59453', 'Bangsri', 'Jepara', 'Jawa Tengah', '59453', true);
