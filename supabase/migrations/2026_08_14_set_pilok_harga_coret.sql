-- Set harga_coret = harga_jual for all Pilok products
UPDATE public.products
SET harga_coret = harga_jual
WHERE kategori = 'Pilok'
  AND harga_jual IS NOT NULL
  AND harga_coret IS DISTINCT FROM harga_jual;
