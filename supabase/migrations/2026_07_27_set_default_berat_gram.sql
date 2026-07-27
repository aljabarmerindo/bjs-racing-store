-- Migration: set default berat_gram untuk produk yang belum memiliki data berat
-- Jalankan di Supabase SQL Editor
-- Default: 500 gram untuk produk kecil/catatan, bisa disesuaikan manual
UPDATE public.products
SET berat_gram = 500
WHERE berat_gram IS NULL OR berat_gram = 0;

-- Verifikasi hasil update
SELECT COUNT(*) AS total_null,
       COUNT(*) FILTER (WHERE berat_gram = 500) AS defaulted_500g,
       COUNT(*) FILTER (WHERE berat_gram > 0 AND berat_gram != 500) AS has_real_weight
FROM public.products;
