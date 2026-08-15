-- Ubah search_onderdil_products ke model ALLOWLIST visibilitas:
-- - Kategori harus terdaftar di product_categories dengan is_active = true
-- - Merek harus terdaftar di product_mereks dengan is_active = true
--   (merek kosong / '-' / NULL dinormalisasi ke 'TANPA MEREK')
-- - Filter p_merek menangani nilai 'TANPA MEREK'
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
    AND EXISTS (
      SELECT 1 FROM public.product_categories pc
      WHERE pc.kategori = p.kategori AND pc.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.product_mereks pm
      WHERE pm.merek = CASE
              WHEN p.merek IS NULL OR btrim(p.merek) = '' OR p.merek = '-' THEN 'TANPA MEREK'
              ELSE btrim(p.merek)
            END
        AND pm.is_active = true
    )
    AND (p_search_term IS NULL OR p.nama ILIKE '%' || p_search_term || '%' OR p.kode ILIKE '%' || p_search_term || '%')
    AND (p_kategori IS NULL OR p.kategori = p_kategori)
    AND (
      p_merek IS NULL
      OR (p_merek = 'TANPA MEREK' AND (p.merek IS NULL OR btrim(p.merek) = '' OR p.merek = '-'))
      OR (p_merek <> 'TANPA MEREK' AND btrim(p.merek) = p_merek)
    )
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
