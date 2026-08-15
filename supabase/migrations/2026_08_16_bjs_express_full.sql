-- Migrasi: Modul BJS Express (kurir internal)
--  - bjs_express_areas: tambah jadwal + tarif flat per area
--  - tabel baru: couriers, courier_assignments, courier_assignment_events
--  - role 'courier' pada profiles (kolom role bebas teks, tidak ada CHECK)
--  - bucket storage: bukti-pengiriman
-- Diterapkan ke project Supabase (jalankan di SQL editor).

-- ============================================================
-- 1) bjs_express_areas: kolom jadwal (jika belum ada) + tarif flat
-- ============================================================
ALTER TABLE public.bjs_express_areas
  ADD COLUMN IF NOT EXISTS open_time TIME DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS cutoff_time TIME DEFAULT '15:00:00',
  ADD COLUMN IF NOT EXISTS shipping_cost INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS etd TEXT DEFAULT '6 - 8 Hours',
  ADD COLUMN IF NOT EXISTS max_weight_gram INTEGER DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS service_name TEXT DEFAULT 'BJS Express';

-- ============================================================
-- 2) Tabel kurir internal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  plate_number text,
  vehicle_type text DEFAULT 'motor',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couriers_user ON public.couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_couriers_active ON public.couriers(is_active);

-- ============================================================
-- 3) Penugasan kurir (maksimal 1 penugasan aktif per order)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','picked','in_transit','dropping_off','completed','cancelled')),
  notes text,
  photo_url text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_assignments_courier ON public.courier_assignments(courier_id, status);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_status ON public.courier_assignments(status);

-- ============================================================
-- 4) Riwayat event penugasan (sumber timeline tracking customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courier_assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.courier_assignments(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_events_assignment ON public.courier_assignment_events(assignment_id, created_at);

-- Trigger auto-update updated_at (reuse fungsi update_updated_at_column dari migrasi bjs_express_areas)
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS trigger AS $$
    BEGIN
      new.updated_at = now();
      return new;
    END;
    $$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_couriers_updated_at' AND tgrelid = 'public.couriers'::regclass
  ) THEN
    CREATE TRIGGER trigger_couriers_updated_at
      BEFORE UPDATE ON public.couriers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $do$;

-- ============================================================
-- 5) RLS
-- ============================================================
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_assignment_events ENABLE ROW LEVEL SECURITY;

-- Helper: ambil id kurir milik user tertentu (nilai NULL jika bukan kurir)
CREATE OR REPLACE FUNCTION public.get_courier_id_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.couriers WHERE user_id = p_user_id LIMIT 1;
$$;

-- couriers: kurir hanya bisa membaca profilnya sendiri (admin via service key)
CREATE POLICY "couriers_select_own" ON public.couriers
  FOR SELECT USING (auth.uid() = user_id);

-- courier_assignments: SELECT untuk kurir yang ditugaskan
CREATE POLICY "courier_assignments_select_courier" ON public.courier_assignments
  FOR SELECT USING (public.get_courier_id_for_user(auth.uid()) = courier_id);

-- courier_assignments: SELECT untuk customer pemilik order
CREATE POLICY "courier_assignments_select_customer" ON public.courier_assignments
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- courier_assignments: kurir dapat memperbarui status/foto penugasannya sendiri
CREATE POLICY "courier_assignments_update_courier" ON public.courier_assignments
  FOR UPDATE USING (public.get_courier_id_for_user(auth.uid()) = courier_id)
  WITH CHECK (public.get_courier_id_for_user(auth.uid()) = courier_id);

-- courier_assignment_events: SELECT untuk kurir
CREATE POLICY "courier_events_select_courier" ON public.courier_assignment_events
  FOR SELECT USING (
    assignment_id IN (
      SELECT a.id FROM public.courier_assignments a
      WHERE a.courier_id = public.get_courier_id_for_user(auth.uid())
    )
  );

-- courier_assignment_events: SELECT untuk customer pemilik order
CREATE POLICY "courier_events_select_customer" ON public.courier_assignment_events
  FOR SELECT USING (
    assignment_id IN (
      SELECT a.id FROM public.courier_assignments a
      JOIN public.orders o ON o.id = a.order_id
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- courier_assignment_events: INSERT oleh kurir untuk penugasannya sendiri
CREATE POLICY "courier_events_insert_courier" ON public.courier_assignment_events
  FOR INSERT WITH CHECK (
    assignment_id IN (
      SELECT a.id FROM public.courier_assignments a
      WHERE a.courier_id = public.get_courier_id_for_user(auth.uid())
    )
  );

-- ============================================================
-- 6) Bucket storage untuk foto bukti pengiriman
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-pengiriman', 'bukti-pengiriman', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bukti_pengiriman_select'
  ) THEN
    CREATE POLICY "bukti_pengiriman_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'bukti-pengiriman');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bukti_pengiriman_insert'
  ) THEN
    CREATE POLICY "bukti_pengiriman_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'bukti-pengiriman' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bukti_pengiriman_update'
  ) THEN
    CREATE POLICY "bukti_pengiriman_update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'bukti-pengiriman' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bukti_pengiriman_delete'
  ) THEN
    CREATE POLICY "bukti_pengiriman_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'bukti-pengiriman' AND auth.role() = 'authenticated');
  END IF;
END $$;
