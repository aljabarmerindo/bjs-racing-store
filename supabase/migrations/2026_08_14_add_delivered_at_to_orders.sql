-- Migration: add delivered_at column to orders for BJS Express delivery confirmation
-- Run this in Supabase SQL Editor

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
