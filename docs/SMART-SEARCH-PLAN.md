# Smart Search: Shopee-Like Cross-Language Product Search

**Tanggal:** 19 Agustus 2026  
**Status:** Dalam Implementasi  
**Repositori:** BJS Racing Store + BJS Racing POS

---

## Masalah

User Indonesia search "Putih" tapi produk namanya "White" → tidak ditemukan.  
User search "Doff" tapi produk namanya "Matte" → tidak ditemukan.  
User search "Busi" tapi produk namanya "Spark Plug" → tidak ditemukan.

## Solusi: Generated Column + Trigger + Synonym System

### Arsitektur

```
┌─────────────────────────────────────────────┐
│  GLOBAL SYNONYMS (search_synonyms table)    │
│  White ↔ Putih, Black ↔ Hitam, dll         │
│  → Berlaku untuk SEMUA produk               │
└─────────────────────────────────────────────┘
                    +
┌─────────────────────────────────────────────┐
│  PER-PRODUCT SYNONYMS (products column)     │
│  Admin ketik: "Pylox, Cat Semprot, Spray"   │
│  → Khusus 1 produk saja                     │
└─────────────────────────────────────────────┘
                    ↓
         ┌──────────────────┐
         │ TRIGGER combines │
         │ → search_terms   │
         │   (generated col)│
         └──────────────────┘
```

---

## Phase 1: Database Migration

### 1.1 Tambah Kolom `products.search_synonyms`

```sql
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_synonyms text DEFAULT '';
```

**Purpose:** Input manual dari admin POS. Contoh: "Pylox, Cat Semprot, Spray Paint"

### 1.2 Tambah Kolom `products.search_terms`

```sql
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_terms text DEFAULT '';
```

**Purpose:** Auto-generated oleh trigger. Digunakan untuk search.

### 1.3 Buat Tabel `search_synonyms`

```sql
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id bigserial PRIMARY KEY,
  group_id text NOT NULL,
  term text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synonyms_term ON public.search_synonyms(term);
CREATE INDEX IF NOT EXISTS idx_synonyms_group ON public.search_synonyms(group_id);
```

### 1.4 Seed Data (~80 entries)

#### Warna (English ↔ Indonesian)
| group_id | term |
|----------|------|
| white | white |
| white | putih |
| black | black |
| black | hitam |
| red | red |
| red | merah |
| blue | blue |
| blue | biru |
| green | green |
| green | hijau |
| yellow | yellow |
| yellow | kuning |
| silver | silver |
| silver | perak |
| gold | gold |
| gold | emas |
| orange | orange |
| orange | oranye |
| orange | jingga |
| pink | pink |
| pink | merah muda |
| purple | purple |
| purple | ungu |
| brown | brown |
| brown | coklat |
| gray | gray |
| gray | grey |
| gray | abu-abu |
| cream | cream |
| cream | krem |
| navy | navy |
| navy | biru tua |
| maroon | maroon |
| maroon | merah tua |

#### Finishing
| group_id | term |
|----------|------|
| matte | matte |
| matte | doff |
| matte | dof |
| glossy | glossy |
| glossy | mengkilap |
| glossy | gloss |
| chrome | chrome |
| chrome | krom |
| metallic | metallic |
| metallic | metalik |
| transparent | transparent |
| transparent | bening |
| transparent | transparan |
| flat | flat |

#### Istilah Cat
| group_id | term |
|----------|------|
| spray_paint | spray paint |
| spray_paint | cat semprot |
| spray_paint | pylox |
| spray_paint | pilok |
| primer | primer |
| primer | dasar |
| clear_coat | clear coat |
| clear_coat | clear |
| clear_coat | pernis |
| clear_coat | vernis |
| thinner | thinner |
| thinner | pengencer |
| thinner | tiner |
| basecoat | basecoat |
| basecoat | cat dasar |

#### Onderdil / Motor
| group_id | term |
|----------|------|
| brake | brake |
| brake | rem |
| engine | engine |
| engine | mesin |
| chain | chain |
| chain | rantai |
| filter | filter |
| filter | saringan |
| spark_plug | spark plug |
| spark_plug | busi |
| bearing | bearing |
| bearing | laker |
| gasket | gasket |
| gasket | paking |
| oil | oil |
| oil | oli |
| clutch | clutch |
| clutch | kopling |
| valve | valve |
| valve | klep |
| piston | piston |
| piston | seher |
| exhaust | exhaust |
| exhaust | knalpot |
| shock | shock absorber |
| shock | shockbreaker |
| tire | tire |
| tire | ban |
| rim | rim |
| rim | velg |
| rim | pelek |
| lamp | lamp |
| lamp | lampu |
| mirror | mirror |
| mirror | spion |
| mirror | kaca spion |

### 1.5 Buat Fungsi `build_search_terms()`

```sql
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
  -- Ambil global synonyms yang match dengan nama produk
  SELECT string_agg(DISTINCT s2.term, ' ')
  INTO v_global_terms
  FROM public.search_synonyms s1
  JOIN public.search_synonyms s2 ON s1.group_id = s2.group_id
  WHERE s1.term = lower(trim(p_nama));

  -- Gabungkan: nama + global synonyms + per-product synonyms
  v_result := trim(
    coalesce(p_nama, '') || ' ' ||
    coalesce(v_global_terms, '') || ' ' ||
    coalesce(p_search_synonyms, '')
  );

  RETURN v_result;
END;
$$;
```

### 1.6 Buat Trigger

```sql
CREATE OR REPLACE FUNCTION public trg_build_search_terms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_terms := public.build_search_terms(NEW.nama, NEW.search_synonyms);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_terms ON public.products;
CREATE TRIGGER trg_products_search_terms
  BEFORE INSERT OR UPDATE OF nama, search_synonyms
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_build_search_terms();
```

### 1.7 Update Produk Existing

```sql
UPDATE public.products
SET search_terms = public.build_search_terms(nama, search_synonyms)
WHERE search_terms IS NULL OR search_terms = '';
```

### 1.8 Buat GIN Index

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_search_terms
  ON public.products USING gin(search_terms gin_trgm_ops);
```

---

## Phase 2: RPC Updates

### 2.1 Store: `search_and_sort_products`

Ganti baris search:
```sql
-- SEBELUM:
AND (p_search_term IS NULL OR p.nama ILIKE '%' || p_search_term || '%' OR p.kode ILIKE '%' || p_search_term || '%')

-- SESUDAH:
AND (p_search_term IS NULL OR p.search_terms ILIKE '%' || p_search_term || '%')
```

### 2.2 Store: `search_onderdil_products`

Sama seperti 2.1.

### 2.3 POS: `search_products`

Ganti baris search:
```sql
-- SEBELUM:
AND (p_search_term IS NULL OR p.nama ILIKE '%' || p_search_term || '%' OR p.kode ILIKE '%' || p_search_term || '%' OR p.merek ILIKE '%' || p_search_term || '%' OR p.kategori ILIKE '%' || p_search_term || '%')

-- SESUDAH:
AND (p_search_term IS NULL OR p.search_terms ILIKE '%' || p_search_term || '%')
```

### 2.4 POS: `search_products_for_po_v2`

Sama seperti 2.3.

---

## Phase 3: POS ProductModal

### 3.1 File: `src/components/ProductModal.jsx`

#### Tambah ke initialProductState (line 13-35):
```js
search_synonyms: "",
```

#### Tambah ke edit mode (line 40-75):
```js
search_synonyms: productToEdit.search_synonyms || "",
```

#### Tambah input field di form UI (setelah field "Catatan"):
```jsx
<div className="sm:col-span-2">
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Sinonim Pencarian
  </label>
  <input
    type="text"
    name="search_synonyms"
    value={product.search_synonyms}
    onChange={handleChange}
    placeholder="Pylox, Cat Semprot, Spray Paint"
    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
  <p className="text-xs text-slate-500 mt-1">
    Pisahkan dengan koma. Sinonim membantu pelanggan menemukan produk ini saat mencari.
  </p>
</div>
```

---

## Phase 4: Store Debounce

### 4.1 File: `src/components/CatalogFilter.jsx`

Tambah debounce 300ms pada search input:
```jsx
const debounceTimer = useRef(null);

const handleSearchChange = (e) => {
  const value = e.target.value;
  clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    handleInputChange(e);
  }, 300);
};
```

---

## Commit Details

### Store Repo
```
Commit: [auto]
Message: feat: smart search - generated column + trigger + synonym system
Files: docs/SMART-SEARCH-PLAN.md, src/components/CatalogFilter.jsx
```

### POS Repo
```
Commit: [auto]
Message: feat: add search_synonyms input field to ProductModal
Files: src/components/ProductModal.jsx
```

### Supabase Migration
```
Applied via: SQL Editor
Tables: search_synonyms (new), products (2 new columns)
Functions: build_search_terms(), trg_build_search_terms()
Triggers: trg_products_search_terms
Indexes: idx_products_search_terms (GIN)
```

---

*Terakhir diperbarui: 19 Agustus 2026*
