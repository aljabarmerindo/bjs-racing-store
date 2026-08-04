drop function if exists public.get_cart_items(uuid);
-- File: supabase/migrations/2026_08_04_get_cart_items_with_dims.sql
-- Perbarui RPC get_cart_items agar mengembalikan kolom dimensi produk (cm)
-- untuk kalkulasi berat volumetrik Biteship di checkout.

create or replace function public.get_cart_items(p_user_id uuid)
returns table(
  id uuid,
  product_id uuid,
  quantity integer,
  nama text,
  harga_jual numeric,
  image_url text,
  berat_gram integer,
  merek text,
  ukuran text,
  stok integer,
  panjang_cm numeric,
  lebar_cm numeric,
  tinggi_cm numeric
)
language plpgsql
as $function$
declare
  v_customer_id uuid;
begin
  select customers.id into v_customer_id
  from public.customers
  where auth_user_id = p_user_id;

  if v_customer_id is null then
    return;
  end if;

  return query
  select
    ci.id,
    ci.product_id,
    ci.quantity,
    p.nama,
    p.harga_jual,
    p.image_url,
    p.berat_gram,
    p.merek,
    p.ukuran,
    p.stok,
    p.panjang_cm,
    p.lebar_cm,
    p.tinggi_cm
  from public.cart_items as ci
  join public.products as p on ci.product_id = p.id
  where ci.customer_id = v_customer_id;
end;
$function$;