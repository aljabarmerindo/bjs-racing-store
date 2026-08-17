drop function if exists public.get_cart_items(uuid);
-- Extend get_cart_items: tambah kolom untuk badge & swatch di cart UI.

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
  tinggi_cm numeric,
  color_swatch_url text,
  sku text,
  kategori text,
  harga_coret numeric,
  total_terjual integer,
  stok_min integer
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
    p.tinggi_cm,
    p.color_swatch_url,
    p.sku,
    p.kategori,
    p.harga_coret,
    p.total_terjual,
    p.stok_min
  from public.cart_items as ci
  join public.products as p on ci.product_id = p.id
  where ci.customer_id = v_customer_id;
end;
$function$;
