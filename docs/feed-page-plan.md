# Feed Page Plan — BJS Racing Store

## 1. Tujuan & Value Proposition

### Primary Goals
1. **SEO & Discovery** — Konten editorial membantu website ditemukan di Google untuk keyword automotive, spray paint, onderdil motor.
2. **Customer Education** — Berikan insight, tips, dan trik seputar spray paint, sparepart motor, perawatan kendaraan.
3. **Engagement & Trust** — Jangkau customer di luar transaksi dengan konten yang berguna.
4. **Traffic Driver** — Feed sebagai landing spot untuk mengarahkan customer ke halaman produk (`/pilok`, `/onderdil`).

### Target Audience
- Owner motor matik/bebek yang ingin modifikasi/custom
- Mekanik yang cari referensi spray paint
- Customer yang ingin belajar perawatan kendaraan
- Community automotive lokal Jepara & sekitarnya

---

## 2. Konten & Format

### Format Konten
| Format | Deskripsi | Contoh |
|--------|-----------|--------|
| **Image Post** | Gambar tunggal atau carousel dengan caption panjang | Tutorial spray paint langkah demi langkah |
| **Video Post** | Embed YouTube (seperti "Video Produk Unggulan") | Review produk, timelapse spray paint |
| **Article Post** | Teks panjang dengan formatasi rich text | Panduan memilih onderdil yang bagus |
| **Product Tag Post** | Post dengan tag produk khusus yang bisa diklik | "Coba pakai cat ini" → link ke produk |
| **Poll Post** | Survey/interactive poll untuk engagement | "Kamu lebih suka spray paint warna apa untuk motor matik?" |
| **Comparison Post** | Perbandingan before-after atau side-by-side | "Spray paint catu vs standar", "Original vs aftermarket" |
| **Event Post** | Event BJS Racing, jadwal custom job, kegiatan komunitas | "Open House BJS Racing - 15 Agustus 2026" |

### Kategori Konten
1. **Tips & Trik Spray Paint**
   - Cara spray paint motor yang benar
   - Teknik blending warna
   - Pilihan nozzle dan pressure
   - Perawatan hasil spray paint

2. **Panduan Sparepart**
   - Memilih sparepart yang bagus
   - Perbedaan sparepart original vs aftermarket
   - Instalasi onderdil dasar
   - Troubleshooting masalah motor

3. **Industry News & Trends**
   - New arrival produk
   - Review produk baru
   - Event/kegiatan BJS Racing
   - Tips gaya motor

4. **Behind the Scene**
   - Proses produksi/custom
   - Customer showcase
   - Team BJS Racing

---

## 3. Database Schema

### Tabel `feed_posts`
```sql
CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  post_type TEXT NOT NULL DEFAULT 'image', -- image, video, article, product_tag, poll, comparison, event
  media_url TEXT, -- URL gambar/video (Google Drive atau YouTube)
  thumbnail_url TEXT, -- Thumbnail untuk video post
  youtube_url TEXT, -- YouTube URL untuk video post
  product_id UUID REFERENCES products(id), -- opsional, untuk product tag post
  category TEXT, -- tips_spray_paint, panduan_sparepart, news, bts
  tags TEXT[], -- array of tags untuk SEO
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- untuk highlight
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabel `feed_comments` (untuk komentar)
```sql
CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE, -- untuk reply
  content TEXT NOT NULL,
  is_spam BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feed_comments_post ON feed_comments(post_id, created_at DESC);
CREATE INDEX idx_feed_comments_customer ON feed_comments(customer_id);
```

### Storage Strategy
| Media Type | Storage | Alasan |
|------------|---------|--------|
| **Gambar feed** | Google Drive (public link) | Irit storage Supabase |
| **Video** | YouTube embed | Lebih ringan server, SEO friendly |
| **Thumbnail** | Google Drive atau auto-fetch YouTube | Konsisten dengan gambar |

### Catatan Penting Google Drive:
- Gunakan format link: `https://drive.google.com/uc?export=view&id=FILE_ID`
- Pastikan file di-set "Anyone with the link can view"
- **Catatan:** Google Drive public link punya rate limit dan CORS issues. Jika nanti bermasalah, disarankan migrate ke Cloudinary atau Supabase Storage.

### Index untuk Performance
```sql
CREATE INDEX idx_feed_posts_published ON feed_posts(is_published, published_at DESC);
CREATE INDEX idx_feed_posts_category ON feed_posts(category);
CREATE INDEX idx_feed_posts_featured ON feed_posts(is_featured);
```

---

## 4. UI/UX Design System

### Pattern: Editorial Content Feed
- **Style:** Motion-Driven dengan microinteractions
- **Layout:** Masonry-style grid untuk mixed content (image/video/article cards)
- **Card Design:** 
  - Image/Video: full-width card dengan overlay gradient untuk text
  - Article: card dengan thumbnail kiri, text kanan
  - Product tag: card dengan badge "Produk" dan link
  - Poll: card dengan opsi voting
  - Comparison: card dengan before/after split view
  - Event: card dengan tanggal dan lokasi badge

### Color Palette (BJS Branded)
| Role | Hex | Tailwind |
|------|-----|---------|
| Primary | #FF7800 | orange-500 |
| Secondary | #EA580C | orange-600 |
| CTA/Accent | #C2410C | orange-700 |
| Background | #FFF7ED | orange-50 |
| Card Background | #FFFFFF | white |
| Text Primary | #0F172A | slate-900 |
| Text Secondary | #475569 | slate-600 |
| Border | #E2E8F0 | slate-200 |

### Typography
- **Heading:** Newsreader (Google Fonts) — elegant, editorial feel
- **Body:** Roboto (already in project) — readable, clean
- **Mood:** news, editorial, journalism, trustworthy, informative

### Key Effects
- Scroll animation (Intersection Observer) untuk card entrance
- Hover: lift effect `hover:-translate-y-1 hover:shadow-lg hover:border-orange-200 transition-all duration-200`
- Image lazy loading dengan blur placeholder
- Video play button overlay dengan pulse animation
- Active/focus states menggunakan orange ring

### Responsive Breakpoints
- Mobile: 1 column grid
- Tablet: 2 columns
- Desktop: 3 columns
- Large desktop: 4 columns

### Card Types
```
┌─────────────────────────────┐
│         [Image/Video]       │
│    ─────────────────────    │
│  Category Badge    Date     │
│  Title                     │
│  Excerpt / Description ... │
│  [Read More]    [Comments]  │
└─────────────────────────────┘

┌──────────┬──────────────────┐
│ [Thumb]  │ Category         │
│          │ Title            │
│          │ Excerpt ...      │
│          │ [Read More]      │
└──────────┴──────────────────┘

┌─────────────────────────────┐
│  [Poll Question]            │
│  ○ Option A                 │
│  ○ Option B                 │
│  ○ Option C                 │
│  [Vote]    [X] votes        │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Before    │    After        │
│  [img]     │    [img]        │
│  Label     │    Label        │
└─────────────────────────────┘
```

---

## 5. Technical Implementation

### Routes
- `/blog` — Main feed page (SSR) — **SEO friendly URL**
- `/blog/[slug]` — Single post detail page (SSR)

### Components
```
src/
├── pages/
│   └── blog/
│       ├── index.astro          # Feed listing
│       └── [slug].astro         # Single post
├── components/
│   └── feed/
│       ├── FeedGrid.tsx          # Masonry grid
│       ├── FeedCard.tsx          # Generic card wrapper
│       ├── ImagePostCard.tsx     # Image post card
│       ├── VideoPostCard.tsx     # YouTube embed card
│       ├── ArticleCard.tsx       # Article card
│       ├── ProductTagCard.tsx    # Product tag card
│       ├── PollPostCard.tsx      # Poll post card
│       ├── ComparisonPostCard.tsx # Comparison post card
│       ├── EventPostCard.tsx     # Event post card
│       ├── CategoryFilter.tsx    # Filter by category
│       ├── SearchBar.tsx         # Search posts
│       ├── FeedPagination.tsx    # Load more / pagination
│       └── CommentSection.tsx    # Comments section
```

### Data Fetching
```typescript
// Server-side di index.astro
const { data: posts } = await supabaseAdmin
  .from('feed_posts')
  .select('*, products(id, nama, harga_jual, image_url), feed_comments(count)')
  .eq('is_published', true)
  .order('published_at', { ascending: false })
  .limit(20);
```

### SEO Strategy
1. **Structured Data** — JSON-LD untuk Article/VideoObject/BlogPosting
2. **Open Graph** — og:image, og:title, og:description untuk setiap post
3. **Sitemap** — Include `/blog` dan `/blog/[slug]` di sitemap.xml
4. **Meta Tags** — Dynamic title dan description per post
5. **Canonical URLs** — Set canonical untuk setiap post
6. **Image Alt Text** — Semua gambar punya alt text yang deskriptif
7. **Schema Markup** — BreadcrumbList, ItemList untuk feed grid
8. **URL Structure** — `/blog/category/post-title` untuk SEO friendly URLs

### SEO Content Strategy
- Setiap post minimal 300 kata teks
- Gunakan keyword: "spray paint motor", "onderdil motor", "tips motor", "custom motor", "perawatan motor"
- Include internal links ke produk terkait
- Include external links ke sumber terpercaya
- Generate meta description otomatis dari excerpt

---

## 6. Admin / CMS

### Integrasi POS App
- Semua fitur admin CRUD **hanya** di aplikasi POS: `/workspaces/bjs-racing-pos/`
- Halaman khusus: **Manajemen Feed Post** di POS
- Fitur: Create, Read, Update, Delete posts
- Upload gambar ke Google Drive (via API atau manual upload)
- Paste YouTube URL untuk video post
- Pilih kategori dan tags
- Set publish status dan featured flag
- Preview post sebelum publish
- Manage comments: delete spam/scam comments

### POS Routes
```
/workspaces/bjs-racing-pos/src/pages/
└── admin/
    └── feed/
        ├── index.jsx          # List posts + create button
        ├── create.jsx         # Create new post
        ├── edit/[id].jsx      # Edit existing post
        ├── preview/[id].jsx   # Preview post
        └── comments/[id].jsx  # Manage comments for post
```

### Google Drive Setup
- Buat folder khusus untuk feed images di Google Drive
- Set sharing permission: "Anyone with the link can view"
- Simpan file ID dan public URL di database `feed_posts.media_url`
- **Alternatif jika Google Drive bermasalah:** Cloudinary free tier (10GB) atau Supabase Storage dengan caching

### Storage Setup
```sql
-- Tabel feed_posts sudah didefinisikan di atas

-- Tabel feed_comments
CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_spam BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feed_comments_post ON feed_comments(post_id, created_at DESC);
CREATE INDEX idx_feed_comments_customer ON feed_comments(customer_id);
```

---

## 7. Component Architecture

### Page Structure
```
/blog (index.astro)
├── Header (h1 + description)
├── CategoryFilter
├── SearchBar
├── FeedGrid
│   └── FeedCard (multiple)
│       ├── ImagePostCard
│       ├── VideoPostCard
│       ├── ArticleCard
│       ├── ProductTagCard
│       ├── PollPostCard
│       ├── ComparisonPostCard
│       └── EventPostCard
└── LoadMore / Pagination

/blog/[slug] (single.astro)
├── Breadcrumb
├── Post header (title, date, category)
├── Media (image/video/article/poll/comparison/event content)
├── Product tag (jika ada)
├── CommentSection
├── Related posts
└── Share buttons
```

### State Management
- Gunakan Zustand untuk:
  - `feedFilters` — category, search query, page
  - `feedPosts` — cached posts
  - `isLoading` — loading state
  - `comments` — cached comments per post

---

## 8. Roadmap & Priorities

### Phase 1: Core MVP (Week 1)
1. Create `feed_posts` dan `feed_comments` table di Supabase
2. Buat halaman `/blog` dengan grid layout
3. Buat komponen cards (image, video, article, product tag)
4. Implementasi kategori dan search basic
5. Buat halaman detail `/blog/[slug]`
6. **POS: Manajemen Feed Post** — CRUD lengkap di aplikasi POS
7. Add comment section dengan admin moderation

### Phase 2: Enhancement (Week 2)
1. Add lazy loading dan infinite scroll
2. Add share button (WhatsApp, Twitter, Facebook)
3. Add related posts recommendation
4. SEO optimization: structured data, sitemap
5. Add poll voting system

### Phase 3: Advanced (Week 3-4)
1. Add comparison post type dengan before/after slider
2. Add event post dengan RSVP/interest system
3. Add analytics: view count, engagement
4. Add newsletter subscription integration
5. Add RSS feed untuk content syndication

---

## 9. Content Guidelines

### Image Specifications
- **Aspect Ratio:** 16:9 untuk landscape, 4:5 untuk portrait
- **File Size:** Max 500KB per image
- **Format:** WebP dengan fallback JPG
- **Resolution:** 1200px width minimum
- **Storage:** Google Drive public link

### Video Specifications
- **Platform:** YouTube only (embed)
- **Aspect Ratio:** 16:9
- **Thumbnail:** Auto-fetch dari YouTube atau custom upload

### Writing Guidelines
- **Title:** 50-60 karakter untuk SEO
- **Excerpt:** 150-160 karakter
- **Content:** Minimal 300 kata
- **Keyword density:** Natural, tidak spam
- **Internal links:** Minimal 1 link ke produk per post
- **External links:** Max 2 links ke sumber terpercaya

---

## 10. Bandwidth & Performance

### Vercel Bandwidth Concern
- **YouTube embed:** Video streams dari Google servers, **tidak memakai bandwidth Vercel**
- **Google Drive images:** Di-serve dari Google servers, **tidak memakai bandwidth Vercel**
- **Halaman HTML/JS/CSS:** ~50-100KB per page, sangat ringan
- **Kesimpulan:** Dengan Google Drive + YouTube, bandwidth Vercel akan **sangat rendah**

### Jika Google Drive Bermasalah
Alternatif storage yang direkomendasikan:
1. **Cloudinary** — Free tier 10GB, CDN global, image optimization otomatis
2. **Supabase Storage** — Dengan `Cache-Control` headers, image di-cache di browser
3. **ImgBB** — Free image hosting dengan direct link

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Konten tidak menarik | Buat content calendar, track engagement metrics |
| Google Drive rate limit | Monitor usage, prepare migrasi ke Cloudinary jika perlu |
| SEO tidak maksimal | Implementasi structured data, sitemap, meta tags |
| Admin ribet | Buat template post, quick edit features |
| Performance lambat | Lazy loading, infinite scroll, image optimization |
| Komentar spam | Admin moderation tools, spam detection |

---

## 12. Success Metrics

1. **Traffic** — 30% increase organic traffic dalam 3 bulan
2. **Engagement** — Average time on page > 2 menit
3. **Conversion** — 5% CTR dari feed ke product pages
4. **SEO** — Top 10 ranking untuk 5 keyword automotive lokal
5. **Content** — 1 post baru per minggu
6. **Comments** — 10+ komentar per post dalam 1 bulan

---

## 13. Bottom Navigation

### New Tab: Feed
- Position: **Sebelah kanan icon Onderdil** (posisi ke-4 dari 5 tab)
- URL: `/blog`
- Icon: Custom icon (spray-paint atau blog icon)
- Label: "Feed" atau "Blog"

### Bottom Nav Structure
```
[Beranda] [Pilok] [Onderdil] [Feed] [Akun]
```

### Icon Recommendation
- Gunakan icon blog/feed yang konsisten dengan style bottom nav
- Inactive: slate-800 outline
- Active: orange-500 solid

---

## 14. Open Questions (Resolved)

1. ✅ **User submission:** Hanya admin yang bisa post
2. ✅ **Comments:** Ya, dengan admin moderation (delete spam/scam)
3. ✅ **Schedule post:** Tidak perlu
4. ✅ **Storage:** Google Drive untuk gambar
5. ✅ **Video:** Hanya YouTube embed
6. ✅ **URL:** `/blog` untuk SEO
7. ✅ **Homepage:** Tidak perlu ditampilkan di homepage, hanya di bottom nav

---

## Appendix: Design System Reference

```
Pattern: Editorial Content Feed
Style: Motion-Driven
Colors: BJS Orange (#FF7800) + zinc/slate neutrals
Typography: Newsreader (heading) + Roboto (body)
Effects: Scroll anim, hover lift, entrance anim
Responsive: 375px, 768px, 1024, 1440px
```

Dokumen ini siap untuk di-review sebelum implementasi dimulai.
