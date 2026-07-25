-- Migration for flash sales management
-- Run this in Supabase SQL Editor

-- 1. Create flash_sales table
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  flash_price numeric NOT NULL,
  original_price numeric NOT NULL,
  stock_allocated integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT flash_sales_pkey PRIMARY KEY (id)
);

-- 2. Enable RLS
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Public can view active flash sales within valid date range
CREATE POLICY "Public can view active flash sales"
  ON public.flash_sales
  FOR SELECT
  USING (
    is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND stock_allocated > 0
  );

-- Authenticated users (admin) can do full CRUD
CREATE POLICY "Admin can insert flash sales"
  ON public.flash_sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update flash sales"
  ON public.flash_sales
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete flash sales"
  ON public.flash_sales
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can view all flash sales"
  ON public.flash_sales
  FOR SELECT USING (auth.role() = 'authenticated');
