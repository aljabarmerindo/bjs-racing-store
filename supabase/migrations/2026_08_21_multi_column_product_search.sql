-- Add multi-column product search support
-- Date: 2026-08-21
-- This migration expands search_products RPC to search across
-- search_terms, kode, sku, merek, and kategori columns.

-- 1) Trigram GIN indexes for partial text search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_kode_trgm
  ON public.products USING gin(kode gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON public.products USING gin(sku gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_merek_trgm
  ON public.products USING gin(merek gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_kategori_trgm
  ON public.products USING gin(kategori gin_trgm_ops);

-- 2) Update search_products RPC (used by POS Produk.jsx, Pos.jsx, NotaOcrModal.jsx, ManajemenFeed.jsx)
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
  WHERE (status_filter = 'semua' OR p.status = status_filter)
    AND (
      search_term IS NULL
      OR search_term = ''
      OR p.search_terms ILIKE '%' || search_term || '%'
      OR p.kode ILIKE '%' || search_term || '%'
      OR p.sku ILIKE '%' || search_term || '%'
      OR p.merek ILIKE '%' || search_term || '%'
      OR p.kategori ILIKE '%' || search_term || '%'
    )
    AND (merek_filter IS NULL OR merek_filter = 'semua' OR p.merek = merek_filter)
    AND (kategori_filter IS NULL OR kategori_filter = 'semua' OR p.kategori = kategori_filter)
    AND (low_stock_only = false OR p.stok <= p.stok_min)
    AND (supplier_filter IS NULL OR supplier_filter = 'semua' OR p.supplier = supplier_filter)
    AND (ukuran_filter IS NULL OR ukuran_filter = 'semua' OR p.ukuran = ukuran_filter)
    AND (lini_produk_filter IS NULL OR lini_produk_filter = 'semua' OR p.lini_produk = lini_produk_filter)
    AND (
      price_range IS NULL OR price_range = 'semua'
      OR (price_range = '0-50000' AND p.harga_jual <= 50000)
      OR (price_range = '50000-100000' AND p.harga_jual > 50000 AND p.harga_jual <= 100000)
      OR (price_range = '100000-200000' AND p.harga_jual > 100000 AND p.harga_jual <= 200000)
      OR (price_range = '200000-500000' AND p.harga_jual > 200000 AND p.harga_jual <= 500000)
      OR (price_range = '500000+' AND p.harga_jual > 500000)
    )
  ORDER BY p.nama;
END;
$$;

-- 3) Update search_products_for_po_v2 RPC (used by POS FormPesananGrosir.jsx, FormPembelian.jsx)
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
    AND (
      search_term IS NULL
      OR search_term = ''
      OR p.search_terms ILIKE '%' || search_term || '%'
      OR p.kode ILIKE '%' || search_term || '%'
      OR p.sku ILIKE '%' || search_term || '%'
      OR p.merek ILIKE '%' || search_term || '%'
      OR p.kategori ILIKE '%' || search_term || '%'
    )
    AND (merek_filter IS NULL OR merek_filter = 'semua' OR p.merek = merek_filter)
    AND (kategori_filter IS NULL OR kategori_filter = 'semua' OR p.kategori = kategori_filter)
    AND (supplier_filter IS NULL OR supplier_filter = 'semua' OR p.supplier = supplier_filter)
  ORDER BY p.nama;
END;
$$;
