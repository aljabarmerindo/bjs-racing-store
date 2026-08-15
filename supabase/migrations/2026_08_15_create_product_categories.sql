-- Create product_categories table for onderdil visibility control
CREATE TABLE IF NOT EXISTS public.product_categories (
  kategori TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.product_categories IS 'Kontrol visibilitas kategori di halaman storefront /onderdil';
COMMENT ON COLUMN public.product_categories.kategori IS 'Nama kategori sesuai products.kategori';
COMMENT ON COLUMN public.product_categories.is_active IS 'true = tampil di /onderdil, false = disembunyikan';
COMMENT ON COLUMN public.product_categories.updated_at IS 'Terakhir diubah';

CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON public.product_categories(is_active);
