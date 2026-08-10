ALTER TABLE public.products ADD CONSTRAINT IF NOT EXISTS products_stok_non_negative CHECK (stok >= 0);
ALTER TABLE public.flash_sales ADD CONSTRAINT IF NOT EXISTS flash_sales_stock_non_negative CHECK (stock_allocated >= 0);
