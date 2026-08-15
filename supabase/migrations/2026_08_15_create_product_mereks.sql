-- Tabel kontrol visibilitas merek di storefront /onderdil (mirror product_categories)
CREATE TABLE IF NOT EXISTS public.product_mereks (
  merek TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.product_mereks IS 'Kontrol visibilitas merek di halaman storefront /onderdil';
COMMENT ON COLUMN public.product_mereks.merek IS 'Nama merek sesuai products.merek (nilai kosong/- dinormalisasi ke TANPA MEREK)';
COMMENT ON COLUMN public.product_mereks.is_active IS 'true = tampil di /onderdil, false = disembunyikan';
COMMENT ON COLUMN public.product_mereks.updated_at IS 'Terakhir diubah';

CREATE INDEX IF NOT EXISTS idx_product_mereks_is_active ON public.product_mereks(is_active);

-- Backfill: daftarkan semua kategori yang belum ada di product_categories (default aktif)
INSERT INTO public.product_categories (kategori, is_active)
SELECT DISTINCT p.kategori, true
FROM public.products p
WHERE p.kategori IS NOT NULL
  AND p.kategori NOT IN ('Pilok', 'Jasa')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_categories pc WHERE pc.kategori = p.kategori
  )
ON CONFLICT (kategori) DO NOTHING;

-- Backfill: daftarkan semua merek (ternormalisasi) di product_mereks (default aktif)
INSERT INTO public.product_mereks (merek, is_active)
SELECT DISTINCT
  CASE
    WHEN p.merek IS NULL OR btrim(p.merek) = '' OR p.merek = '-' THEN 'TANPA MEREK'
    ELSE btrim(p.merek)
  END, true
FROM public.products p
ON CONFLICT (merek) DO NOTHING;

-- Trigger: auto-registrasi kategori & merek baru dari produk (default aktif)
-- Kategori yang sudah pernah dinonaktifkan tidak akan diaktifkan ulang (ON CONFLICT DO NOTHING)
CREATE OR REPLACE FUNCTION public.sync_product_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kategori IS NOT NULL AND NEW.kategori NOT IN ('Pilok', 'Jasa') THEN
    INSERT INTO public.product_categories (kategori, is_active)
    VALUES (NEW.kategori, true)
    ON CONFLICT (kategori) DO NOTHING;
  END IF;

  INSERT INTO public.product_mereks (merek, is_active)
  VALUES (
    CASE
      WHEN NEW.merek IS NULL OR btrim(NEW.merek) = '' OR NEW.merek = '-' THEN 'TANPA MEREK'
      ELSE btrim(NEW.merek)
    END,
    true
  )
  ON CONFLICT (merek) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_visibility ON public.products;
CREATE TRIGGER trg_products_sync_visibility
AFTER INSERT OR UPDATE OF kategori, merek, status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_visibility();
