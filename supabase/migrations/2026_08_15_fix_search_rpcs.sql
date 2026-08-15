-- Restore & perbaiki RPC search_onderdil_products (halaman Onderdil)
-- Mengembalikan fungsi + menambahkan filter visibility kategori via product_categories
-- Sort: terlaris=total_terjual, terbaru=created_at, termurah=harga_jual ASC, termahal=harga_jual DESC
-- Hapus overload lama (urutan parameter berbeda & tanpa filter product_categories)
-- agar pemanggilan RPC dengan parameter bernama tidak ambigu (error 42725).
DROP FUNCTION IF EXISTS public.search_onderdil_products(
  p_kategori text,
  p_merek text,
  p_vehicle_brand_id bigint,
  p_vehicle_model_id bigint,
  p_sort_by text,
  p_search_term text
);

CREATE OR REPLACE FUNCTION public.search_onderdil_products(
  p_sort_by text DEFAULT 'terbaru',
  p_search_term text DEFAULT NULL,
  p_kategori text DEFAULT NULL,
  p_merek text DEFAULT NULL,
  p_vehicle_brand_id bigint DEFAULT NULL,
  p_vehicle_model_id bigint DEFAULT NULL
)
RETURNS SETOF public.products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'Aktif'
    AND (p.kategori IS DISTINCT FROM 'Pilok')
    AND (p.kategori IS DISTINCT FROM 'Jasa')
    AND (p.kategori IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.product_categories pc
      WHERE pc.kategori = p.kategori AND pc.is_active = false
    )
    AND (p_search_term IS NULL OR p.nama ILIKE '%' || p_search_term || '%' OR p.kode ILIKE '%' || p_search_term || '%')
    AND (p_kategori IS NULL OR p.kategori = p_kategori)
    AND (p_merek IS NULL OR p.merek = p_merek)
    AND (p_vehicle_brand_id IS NULL OR EXISTS (
      SELECT 1 FROM public.product_vehicle_compatibility pvc
      JOIN public.vehicle_models vm ON vm.id = pvc.vehicle_model_id
      WHERE pvc.product_id = p.id AND vm.brand_id = p_vehicle_brand_id
    ))
    AND (p_vehicle_model_id IS NULL OR EXISTS (
      SELECT 1 FROM public.product_vehicle_compatibility pvc
      WHERE pvc.product_id = p.id AND pvc.vehicle_model_id = p_vehicle_model_id
    ))
  ORDER BY
    CASE WHEN p_sort_by = 'terlaris'   THEN p.total_terjual END DESC,
    CASE WHEN p_sort_by = 'terbaru'    THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'harga_asc'  THEN p.harga_jual END ASC,
    CASE WHEN p_sort_by = 'harga_desc' THEN p.harga_jual END DESC,
    p.created_at DESC;
END;
$$;

-- Restore & perbaiki RPC search_and_sort_products (halaman Pilok & lainnya)
-- Sort sama dengan di atas. Filter kategori disesuaikan dengan parameter p_kategori
-- (halaman Pilok mengirim p_kategori='Pilok' via filterConfig.category)
CREATE OR REPLACE FUNCTION public.search_and_sort_products(
  p_sort_by text DEFAULT 'terbaru',
  p_search_term text DEFAULT NULL,
  p_kategori text DEFAULT NULL,
  p_merek text DEFAULT NULL,
  p_lini_produk text DEFAULT NULL,
  p_color_variant text DEFAULT NULL,
  p_ukuran text DEFAULT NULL
)
RETURNS SETOF public.products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'Aktif'
    AND (p.kategori IS NOT DISTINCT FROM 'Pilok' OR p.kategori IS NOT DISTINCT FROM 'Jasa' OR p.kategori IS NOT NULL)
    AND (p_search_term IS NULL OR p.nama ILIKE '%' || p_search_term || '%' OR p.kode ILIKE '%' || p_search_term || '%')
    AND (p_kategori IS NULL OR p.kategori = p_kategori)
    AND (p_merek IS NULL OR p.merek = p_merek)
    AND (p_lini_produk IS NULL OR p.lini_produk = p_lini_produk)
    AND (p_color_variant IS NULL OR p.color_variant = p_color_variant)
    AND (p_ukuran IS NULL OR p.ukuran = p_ukuran)
  ORDER BY
    CASE WHEN p_sort_by = 'terlaris'   THEN p.total_terjual END DESC,
    CASE WHEN p_sort_by = 'terbaru'    THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'harga_asc'  THEN p.harga_jual END ASC,
    CASE WHEN p_sort_by = 'harga_desc' THEN p.harga_jual END DESC,
    p.created_at DESC;
END;
$$;
