-- Migration: add shipping fields for POS transactions
-- Run this in Supabase SQL Editor

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS shipping_service text,
  ADD COLUMN IF NOT EXISTS shipping_etd text,
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid,
  ADD COLUMN IF NOT EXISTS courier_details jsonb;

CREATE OR REPLACE VIEW public.transactions_list_view AS
SELECT
  t.*,
  c.nama_pelanggan,
  c.telepon,
  a.full_address AS shipping_full_address,
  a.destination_text AS shipping_destination_text,
  a.postal_code AS shipping_postal_code
FROM public.transactions t
LEFT JOIN public.customers c ON c.id = t.customer_id
LEFT JOIN public.customer_addresses a ON a.id = t.shipping_address_id;
