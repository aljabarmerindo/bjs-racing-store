-- Migration: add type column to stock_logs and update trigger
-- Run this in Supabase SQL Editor

-- 1. Add type column
ALTER TABLE public.stock_logs 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'sale';

-- 2. Update trigger
CREATE OR REPLACE FUNCTION public.handle_stock_log_change()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET
      stok = stok + NEW.perubahan,
      total_terjual = total_terjual + 
        CASE 
          WHEN NEW.type = 'sale' AND NEW.perubahan < 0 THEN ABS(NEW.perubahan)
          WHEN NEW.type = 'restore' AND NEW.perubahan > 0 THEN -NEW.perubahan
          ELSE 0 
        END
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
