-- Smart Search: Generated Column + Trigger + Synonym System
-- Applied: 2026-08-19

-- 1.1 Tambah kolom products.search_synonyms (input manual dari admin)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_synonyms text DEFAULT '';

-- 1.2 Tambah kolom products.search_terms (auto-generated oleh trigger)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_terms text DEFAULT '';

-- 1.3 Buat tabel search_synonyms (global synonym mappings)
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id bigserial PRIMARY KEY,
  group_id text NOT NULL,
  term text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synonyms_term ON public.search_synonyms(term);
CREATE INDEX IF NOT EXISTS idx_synonyms_group ON public.search_synonyms(group_id);

-- 1.4 Seed data: Warna (English ↔ Indonesian)
INSERT INTO public.search_synonyms (group_id, term) VALUES
('white', 'white'), ('white', 'putih'),
('black', 'black'), ('black', 'hitam'),
('red', 'red'), ('red', 'merah'),
('blue', 'blue'), ('blue', 'biru'),
('green', 'green'), ('green', 'hijau'),
('yellow', 'yellow'), ('yellow', 'kuning'),
('silver', 'silver'), ('silver', 'perak'),
('gold', 'gold'), ('gold', 'emas'),
('orange', 'orange'), ('orange', 'oranye'), ('orange', 'jingga'),
('pink', 'pink'), ('pink', 'merah muda'),
('purple', 'purple'), ('purple', 'ungu'),
('brown', 'brown'), ('brown', 'coklat'),
('gray', 'gray'), ('gray', 'grey'), ('gray', 'abu-abu'),
('cream', 'cream'), ('cream', 'krem'),
('navy', 'navy'), ('navy', 'biru tua'),
('maroon', 'maroon'), ('maroon', 'merah tua')
ON CONFLICT (term) DO NOTHING;

-- 1.5 Seed data: Finishing
INSERT INTO public.search_synonyms (group_id, term) VALUES
('matte', 'matte'), ('matte', 'doff'), ('matte', 'dof'),
('glossy', 'glossy'), ('glossy', 'mengkilap'), ('glossy', 'gloss'),
('chrome', 'chrome'), ('chrome', 'krom'),
('metallic', 'metallic'), ('metallic', 'metalik'),
('transparent', 'transparent'), ('transparent', 'bening'), ('transparent', 'transparan'),
('flat', 'flat')
ON CONFLICT (term) DO NOTHING;

-- 1.6 Seed data: Istilah Cat
INSERT INTO public.search_synonyms (group_id, term) VALUES
('spray_paint', 'spray paint'), ('spray_paint', 'cat semprot'), ('spray_paint', 'pylox'), ('spray_paint', 'pilok'),
('primer', 'primer'), ('primer', 'dasar'),
('clear_coat', 'clear coat'), ('clear_coat', 'clear'), ('clear_coat', 'pernis'), ('clear_coat', 'vernis'),
('thinner', 'thinner'), ('thinner', 'pengencer'), ('thinner', 'tiner'),
('basecoat', 'basecoat'), ('basecoat', 'cat dasar')
ON CONFLICT (term) DO NOTHING;

-- 1.7 Seed data: Onderdil / Motor
INSERT INTO public.search_synonyms (group_id, term) VALUES
('brake', 'brake'), ('brake', 'rem'),
('engine', 'engine'), ('engine', 'mesin'),
('chain', 'chain'), ('chain', 'rantai'),
('filter', 'filter'), ('filter', 'saringan'),
('spark_plug', 'spark plug'), ('spark_plug', 'busi'),
('bearing', 'bearing'), ('bearing', 'laker'),
('gasket', 'gasket'), ('gasket', 'paking'),
('oil', 'oil'), ('oil', 'oli'),
('clutch', 'clutch'), ('clutch', 'kopling'),
('valve', 'valve'), ('valve', 'klep'),
('piston', 'piston'), ('piston', 'seher'),
('exhaust', 'exhaust'), ('exhaust', 'knalpot'),
('shock', 'shock absorber'), ('shock', 'shakebreaker'),
('tire', 'tire'), ('tire', 'ban'),
('rim', 'rim'), ('rim', 'velg'), ('rim', 'pelek'),
('lamp', 'lamp'), ('lamp', 'lampu'),
('mirror', 'mirror'), ('mirror', 'spion'), ('mirror', 'kaca spion')
ON CONFLICT (term) DO NOTHING;

-- 1.8 Buat fungsi build_search_terms()
CREATE OR REPLACE FUNCTION public.build_search_terms(
  p_nama text,
  p_search_synonyms text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_global_terms text;
  v_result text;
BEGIN
  SELECT string_agg(DISTINCT s2.term, ' ')
  INTO v_global_terms
  FROM public.search_synonyms s1
  JOIN public.search_synonyms s2 ON s1.group_id = s2.group_id
  WHERE s1.term = lower(trim(p_nama));

  v_result := trim(
    coalesce(p_nama, '') || ' ' ||
    coalesce(v_global_terms, '') || ' ' ||
    coalesce(p_search_synonyms, '')
  );

  RETURN v_result;
END;
$$;

-- 1.9 Buat trigger function
CREATE OR REPLACE FUNCTION public.trg_build_search_terms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_terms := public.build_search_terms(NEW.nama, NEW.search_synonyms);
  RETURN NEW;
END;
$$;

-- 1.10 Buat trigger
DROP TRIGGER IF EXISTS trg_products_search_terms ON public.products;
CREATE TRIGGER trg_products_search_terms
  BEFORE INSERT OR UPDATE OF nama, search_synonyms
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_build_search_terms();

-- 1.11 Update produk existing
UPDATE public.products
SET search_terms = public.build_search_terms(nama, search_synonyms)
WHERE search_terms IS NULL OR search_terms = '';

-- 1.12 Buat GIN index untuk performa search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_search_terms
  ON public.products USING gin(search_terms gin_trgm_ops);
