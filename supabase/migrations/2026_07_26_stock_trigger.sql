-- Migration: create stock trigger for automatic stock deduction
-- Run this in Supabase SQL Editor if not already applied

CREATE OR REPLACE FUNCTION public.handle_stock_log_change()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET
      stok = stok + NEW.perubahan,
      total_terjual = total_terjual + CASE WHEN NEW.perubahan < 0 THEN ABS(NEW.perubahan) ELSE 0 END
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_handle_stock_log_change ON public.stock_logs;
CREATE TRIGGER trigger_handle_stock_log_change
  AFTER INSERT ON public.stock_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_stock_log_change();
