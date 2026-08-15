-- File: supabase/migrations/2026_08_16_fix_stock_log_online_sale.sql
-- Perbaikan mismatch stok: pesanan online terpotong 2x (reserve saat bayar + sale saat kirim).
--
-- Semantik:
--   reserve      (-qty) : potong stok saat pembayaran dikonfirmasi (stok dikunci).
--   restore      (+qty) : kembalikan stok saat pesanan dibatalkan/diganti.
--   sale         (-qty) : penjualan OFFLINE (POS kasir) -> potong stok + hitung total_terjual.
--   online_sale  (-qty) : penjualan ONLINE yang sudah dipotong via reserve
--                         -> TIDAK memotong stok lagi, hanya menambah total_terjual.
--
-- Dengan ini semua jalur konfirmasi pengiriman online (Biteship webhook,
-- endpoint deliver admin, dan POS halaman Pesanan Online) konsisten:
-- stok hanya terpotong SATU kali (saat bayar), total_terjual tetap bertambah.

CREATE OR REPLACE FUNCTION public.handle_stock_log_change()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET
      stok = stok + CASE
        WHEN NEW.type = 'online_sale' THEN 0
        ELSE NEW.perubahan
      END,
      total_terjual = total_terjual + CASE
        WHEN NEW.type IN ('sale', 'online_sale') AND NEW.perubahan < 0 THEN ABS(NEW.perubahan)
        WHEN NEW.type = 'restore' AND NEW.perubahan > 0 THEN -NEW.perubahan
        ELSE 0
      END
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
