-- Migration for product revenue calculation
-- Run this in Supabase SQL Editor

-- 1. Create view for products with total revenue from paid/shipped/completed orders
CREATE OR REPLACE VIEW public.products_with_revenue AS
SELECT
  p.*,
  COALESCE(SUM(oi.quantity * oi.price), 0) AS total_penjualan
FROM
  public.products p
  LEFT JOIN public.order_items oi ON p.id = oi.product_id
  LEFT JOIN public.orders o ON oi.order_id = o.id
    AND o.status IN ('paid', 'completed', 'shipped')
GROUP BY
  p.id;
