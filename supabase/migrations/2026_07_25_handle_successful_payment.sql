-- Migration: create RPC handle_successful_payment
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_successful_payment(p_order_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'paid'
  WHERE order_number = p_order_number
    AND status NOT IN ('paid', 'completed', 'shipped', 'cancelled');
END;
$$;
