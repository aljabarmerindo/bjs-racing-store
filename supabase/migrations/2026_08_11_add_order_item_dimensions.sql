alter table public.order_items
  add column if not exists berat_gram integer,
  add column if not exists panjang_cm numeric,
  add column if not exists lebar_cm numeric,
  add column if not exists tinggi_cm numeric;
