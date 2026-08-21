-- Add notes column to orders table for customer order remarks
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
