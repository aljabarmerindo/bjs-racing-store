# Implementasi Custom Domain `bjsracing.com`

> **Catatan:** Konfigurasi ini harus dilakukan manual di dashboard Cloudflare dan Vercel. Dokumen ini adalah panduan langkah demi langkah.

## Ringkasan
- **Domain:** `bjsracing.com` (Cloudflare)
- **Hosting:** Vercel (`bjs-racing-store.vercel.app`)
- **Target:** `bjsracing.com` + `www.bjsracing.com` → Vercel
- **Redirect:** `www` → non-`www` (`bjsracing.com` sebagai primary)

---

## Langkah 1: Tambah Domain di Vercel

1. Buka [Vercel Dashboard](https://vercel.com)
2. Pilih project **`bjs-racing-store`**
3. **Settings** → **Domains**
4. Tambahkan domain:
   - `bjsracing.com`
   - `www.bjsracing.com`
5. Vercel akan menampilkan konfirmasi dan instruksi DNS

**Catatan:** Vercel mungkin memerlukan verifikasi ownership. Ikuti instruksi di dashboard.

---

## Langkah 2: Konfigurasi DNS di Cloudflare

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih domain **`bjsracing.com`**
3. **DNS** → **Records**

### Tambahkan Record untuk Root Domain (`bjsracing.com`)

| Type | Name | Value | Proxy status |
|------|------|-------|--------------|
| `CNAME` | `@` | `cname.vercel-dns.com` | ✅ Proxied (orange) |

> **Catatan:** Cloudflare mendukung CNAME untuk root domain (CNAME Flattening). Alternatif lain adalah menggunakan A record ke IP Vercel, tapi CNAME lebih aman dan otomatis mengikuti perubahan Vercel.

### Tambahkan Record untuk `www`

| Type | Name | Value | Proxy status |
|------|------|-------|--------------|
| `CNAME` | `www` | `cname.vercel-dns.com` | ✅ Proxied (orange) |

---

## Langkah 3: Konfigurasi SSL/TLS di Cloudflare

1. **SSL/TLS** → **Overview**
2. Set ke **Full** atau **Full (Strict)**
   - Vercel sudah menyediakan SSL valid, jadi **Full** aman.
3. **Edge Certificates:**
   - **Always Use HTTPS:** ✅ ON
   - **Automatic HTTPS Rewrites:** ✅ ON

---

## Langkah 4: Setup Redirect `www` → non-`www`

### Opsi A: Via Vercel (Recommended)
1. Di Vercel Dashboard → **Settings** → **Domains**
2. Pilih `www.bjsracing.com`
3. Set sebagai **Redirect** ke `bjsracing.com`
4. Vercel otomatis handle 301 redirect

### Opsi B: Via Cloudflare Page Rule
1. **Rules** → **Page Rules**
2. Buat rule:
   - URL: `www.bjsracing.com/*`
   - Setting: **Forwarding URL (301)** → `https://bjsracing.com/$1`

---

## Langkah 5: Validasi

Setelah propagasi DNS (biasanya 5-30 menit, maks 24 jam):

```bash
# Cek DNS resolution
dig bjsracing.com
dig www.bjsracing.com

# Cek HTTP response
curl -I https://bjsracing.com
curl -I https://www.bjsracing.com

# Cek SSL certificate
curl -v https://bjsracing.com 2>&1 | grep -i "subject:"
```

**Yang diharapkan:**
- `dig bjsracing.com` → resolve ke Vercel
- `dig www.bjsracing.com` → resolve ke Vercel
- `curl -I https://bjsracing.com` → `200 OK`
- `curl -I https://www.bjsracing.com` → `301 redirect` ke `https://bjsracing.com`
- SSL certificate valid untuk kedua domain

---

## Troubleshooting

| Gejala | Solusi |
|--------|--------|
| DNS tidak resolve | Cek TTL di Cloudflare, tunggu propagasi |
| SSL error | Pastikan SSL/TLS di Cloudflare set ke **Full** |
| Redirect tidak bekerja | Cek Page Rule di Cloudflare atau redirect setting di Vercel |
| `ERR_SSL_PROTOCOL_ERROR` | Clear cache browser, coba mode incognito |

---

## Checklist Implementasi

- [ ] Tambah `bjsracing.com` di Vercel Dashboard
- [ ] Tambah `www.bjsracing.com` di Vercel Dashboard
- [ ] Tambah CNAME `@` → `cname.vercel-dns.com` di Cloudflare
- [ ] Tambah CNAME `www` → `cname.vercel-dns.com` di Cloudflare
- [ ] Set SSL/TLS ke **Full** di Cloudflare
- [ ] ON **Always Use HTTPS** di Cloudflare
- [ ] ON **Automatic HTTPS Rewrites** di Cloudflare
- [ ] Setup redirect `www` → non-`www` (via Vercel atau Cloudflare)
- [ ] Validasi DNS resolution
- [ ] Validasi HTTP response
- [ ] Validasi SSL certificate

---

**Status:** Ready untuk dijalankan manual di dashboard Cloudflare dan Vercel.
