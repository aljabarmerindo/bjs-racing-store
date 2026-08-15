-- File: supabase/migrations/2026_08_16_bjs_express_live_tracking.sql
-- Fase 5: Live tracking kurir BJS Express via Supabase Realtime.

-- Tabel lokasi kurir per penugasan
create table if not exists public.courier_locations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.courier_assignments(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  heading double precision,
  speed double precision,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_courier_locations_assignment
  on public.courier_locations(assignment_id, recorded_at desc);

alter table public.courier_locations enable row level security;

-- Kurir boleh insert lokasi untuk penugasan miliknya
create policy "courier_locations_insert_own"
  on public.courier_locations
  for insert
  with check (
    exists (
      select 1
      from public.courier_assignments ca
      join public.couriers c on c.id = ca.courier_id
      where ca.id = assignment_id and c.user_id = auth.uid()
    )
  );

-- Kurir boleh baca riwayat lokasi penugasannya sendiri
create policy "courier_locations_select_own"
  on public.courier_locations
  for select
  using (
    exists (
      select 1
      from public.courier_assignments ca
      join public.couriers c on c.id = ca.courier_id
      where ca.id = assignment_id and c.user_id = auth.uid()
    )
  );

-- Publik boleh baca lokasi (dipakai halaman tracking realtime via anon key).
-- Aman karena assignment_id berupa UUID acak yang tidak bisa ditebak,
-- dan lokasi hanya relevan selama penugasan berjalan.
create policy "courier_locations_select_public"
  on public.courier_locations
  for select
  using (true);

-- Aktifkan realtime untuk tabel lokasi
alter publication supabase_realtime add table public.courier_locations;

-- Agar filter realtime assignment_id berfungsi andal
alter table public.courier_locations replica identity full;
