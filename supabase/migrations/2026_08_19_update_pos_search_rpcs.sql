-- Update POS search RPCs to use search_terms column
-- Applied: 2026-08-19
-- Note: These functions were originally created in Supabase SQL Editor, not in migrations.
-- This migration updates them to use the new search_terms column.

-- 1) search_products - used by POS Produk.jsx, Pos.jsx, NotaOcrModal.jsx
CREATE OR REPLACE FUNCTION public.search_products(
  search_term text DEFAULT NULL,
  merek_filter text DEFAULT NULL,
  kategori_filter text DEFAULT NULL,
  status_filter text DEFAULT 'Aktif',
  low_stock_only boolean DEFAULT false,
  supplier_filter text DEFAULT NULL,
  ukuran_filter text DEFAULT NULL,
  lini_produk_filter text DEFAULT NULL,
  price_range text DEFAULT 'semua'
)
RETURNS SETOF public.products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.status = status_filter
    AND (search_term IS NULL OR p.search_terms ILIKE '%' || search_term || '%')
    AND (merek_filter IS NULL OR p.merek = merek_filter)
    AND (kategori_filter IS NULL OR p.kategori = kategori_filter)
    AND (low_stock_only = false OR p.stok <= p.stok_min)
    AND (supplier_filter IS NULL OR supplier_filter = 'semua' OR p.supplier = supplier_filter)
    AND (ukuran_filter IS NULL OR p.ukuran = ukuran_filter)
    AND (lini_produk_filter IS NULL OR p.lini_produk = lini_produk_filter)
    AND (
      price_range = 'semua'
      OR (price_range = '0-50000' AND p.harga_jual <= 50000)
      OR (price_range = '50000-100000' AND p.harga_jual > 50000 AND p.harga_jual <= 100000)
      OR (price_range = '100000-200000' AND p.harga_jual > 100000 AND p.harga_jual <= 200000)
      OR (price_range = '200000-500000' AND p.harga_jual > 200000 AND p.harga_jual <= 500000)
      OR (price_range = '500000+' AND p.harga_jual > 500000)
    )
  ORDER BY p.nama;
END;
$$;

-- 2) search_products_for_po_v2 - used by POS FormPesananGrosir.jsx, FormPembelian.jsx
CREATE OR REPLACE FUNCTION public.search_products_for_po_v2(
  search_term text DEFAULT NULL,
  merek_filter text DEFAULT NULL,
  kategori_filter text DEFAULT NULL,
  supplier_filter text DEFAULT 'semua'
)
RETURNS SETOF public.products
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.status = 'Aktif'
    AND (search_term IS NULL OR p.search_terms ILIKE '%' || search_term || '%')
    AND (merek_filter IS NULL OR p.merek = merek_filter)
    AND (kategori_filter IS NULL OR p.kategori = kategori_filter)
    AND (supplier_filter IS NULL OR supplier_filter = 'semua' OR p.supplier = supplier_filter)
  ORDER BY p.nama;
END;
$$;
