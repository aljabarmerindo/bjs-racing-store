-- Migration for product revenue calculation
-- Run this in Supabase SQL Editor

-- Create view for products with total revenue from:
-- 1. Online orders (orders + order_items tables)
-- 2. POS transactions (transactions table with JSONB items)

CREATE OR REPLACE VIEW public.products_with_revenue AS
WITH order_revenue AS (
  SELECT
    oi.product_id,
    SUM(oi.quantity * oi.price) AS total
  FROM
    public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
      AND o.status IN ('paid', 'completed', 'shipped')
  GROUP BY
    oi.product_id
),
transaction_revenue AS (
  SELECT
    (item->>'id')::uuid AS product_id,
    SUM((item->>'quantity')::int * (item->>'harga_jual')::numeric) AS total
  FROM
    public.transactions,
    jsonb_array_elements(items) AS item
  WHERE
    status_pembayaran = 'Lunas'
  GROUP BY
    (item->>'id')::uuid
)
SELECT
  p.*,
  COALESCE(SUM(order_rev.total), 0) + COALESCE(SUM(transaction_rev.total), 0) AS total_penjualan
FROM
  public.products p
  LEFT JOIN order_revenue order_rev ON p.id = order_rev.product_id
  LEFT JOIN transaction_revenue transaction_rev ON p.id = transaction_rev.product_id
GROUP BY
  p.id;
