# Midtrans Payment Gateway Setup

## Current Status: SANDBOX / TEST MODE

Saat ini aplikasi menggunakan **Midtrans Sandbox** untuk testing.

### Sandbox URLs (Current)
- **API:** `https://app.sandbox.midtrans.com/snap/v1/transactions`
- **Snap.js:** `https://app.sandbox.midtrans.com/snap/snap.js`
- **Dashboard:** https://simulator.sandbox.midtrans.com/

### Environment Variables (Sandbox)
```
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxx
PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxx
```

---

## When Ready for Production

### Step 1: Ganti Environment Variables
Ubah di Vercel Dashboard → Project → Environment Variables:

```
MIDTRANS_SERVER_KEY=<PRODUCTION_SERVER_KEY>
PUBLIC_MIDTRANS_CLIENT_KEY=<PRODUCTION_CLIENT_KEY>
```

### Step 2: Ganti Hardcoded URLs

#### File 1: `src/pages/api/payment/create-transaction.ts` (line 356)
```diff
- "https://app.sandbox.midtrans.com/snap/v1/transactions",
+ "https://app.midtrans.com/snap/v1/transactions",
```

#### File 2: `src/pages/checkout.astro` (line 17)
```diff
- <script slot="head-scripts" is:inline src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={midtransClientKey}></script>
+ <script slot="head-scripts" is:inline src="https://app.midtrans.com/snap/snap.js" data-client-key={midtransClientKey}></script>
```

### Step 3: Verify di Midtrans Dashboard
1. Login ke https://dashboard.midtrans.com/
2. Pastikan mode **Production** aktif
3. Test transaksi dengan kartu credit test: `4811 1111 1111 1111`

### Step 4: Test End-to-End
1. Checkout di STORE
2. Bayar via Midtrans
3. Cek order status berubah ke `paid`
4. Cek stok produk berkurang
5. Cek WhatsApp notification terkirim

---

## Catatan Penting
- Jangan pernah commit `MIDTRANS_SERVER_KEY` production ke repo
- Selalu test di sandbox sebelum deploy ke production
- Midtrans production membutuhkan verifikasi bisnis
- Webhook URL harus di-set di Midtrans Dashboard: `https://bjsracing.com/api/payment/webhook`

## Related Files
- `src/pages/api/payment/create-transaction.ts` — Create transaction
- `src/pages/checkout.astro` — Checkout page dengan Snap.js
- `src/pages/api/payment/webhook.ts` — Webhook handler
- `src/lib/bri.ts` — BRI QRIS alternative
