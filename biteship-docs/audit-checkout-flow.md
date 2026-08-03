# Audit: End-to-End Flow Kurir Biteship — Halaman Checkout

**Tanggal:** 2026-08-02
**Ruang Lingkup:** Integrasi Biteship pada halaman checkout (`CheckoutView.tsx`, `biteship.ts`, API endpoints Biteship, webhook, dan payment flow)
**Referensi Dokumentasi:** [Biteship API Reference](https://biteship.com/en/docs/api/orders/create), [Biteship Webhook Overview](https://biteship.com/en/docs/api/webhook/overview)

---

## Ringkasan Flow End-to-End

```
1. Customer pilih alamat → OSRM hitung jarak
2. Customer klik "Cek Tarif" → POST /api/shipping/biteship/rates → getBiteshipRates()
3. Customer pilih layanan → selectedShipping tersimpan di state
4. Customer pilih metode pembayaran → selectedPaymentMethod tersimpan
5. Customer klik "Lanjut ke Pembayaran" → handlePayment()
6. POST /api/payment/create-transaction → buat order (status: awaiting_payment)
7. Jika kurir Biteship → POST /api/shipping/biteship/book (fire-and-forget)
8. Jika Midtrans → redirect ke Snap payment
9. Webhook Midtrans → confirmOrderPayment() → status jadi "paid"
10. Untuk Midtrans + GOJEK → POST /api/shipping/biteship/auto-book-gojek (di onSuccess callback)
11. Biteship webhook → update shipping_status di order
12. Customer tracking → GET /api/shipping/biteship/track
```

---

## File yang Terlibat

| File | Peran |
|------|-------|
| `src/lib/biteship.ts` | Klien API Biteship (rates, order, tracking, webhook verify, area search) |
| `src/components/CheckoutView.tsx` | UI checkout — pemilihan alamat, kurir, pembayaran, modal pembayaran |
| `src/pages/api/shipping/biteship/rates.ts` | Endpoint tarif pengiriman (proxy ke `getBiteshipRates`) |
| `src/pages/api/shipping/biteship/book.ts` | Endpoint booking kurir Biteship (proxy ke `createBiteshipOrder`) |
| `src/pages/api/shipping/biteship/webhook.ts` | Webhook handler untuk update status pengiriman |
| `src/pages/api/shipping/biteship/label.ts` | Generate shipping label HTML untuk thermal printer |
| `src/pages/api/shipping/biteship/track.ts` | Endpoint tracking pengiriman |
| `src/pages/api/shipping/biteship/geocode.ts` | Geocoding alamat via Biteship Maps |
| `src/pages/api/shipping/biteship/search-area.ts` | Pencarian area/alamat via Biteship Maps |
| `src/pages/api/shipping/biteship/auto-book-gojek.ts` | Auto-booking GOJEK untuk order yang memenuhi syarat |
| `src/pages/api/shipping/biteship/label.ts` | Generate shipping label |
| `src/pages/api/payment/create-transaction.ts` | Pembuatan order + inisiasi pembayaran (Midtrans) |
| `src/pages/api/payment/webhook.ts` | Webhook Midtrans — konfirmasi pembayaran |
| `src/pages/api/payment/status.ts` | Cek status order untuk polling |
| `src/pages/api/payment/confirm.ts` | Konfirmasi pembayaran manual (admin) |
| `src/lib/confirmOrderPayment.ts` | Logika konfirmasi pembayaran (dipakai bersama webhook Midtrans dan admin confirm) |
| `src/lib/gojekAutoBooking.ts` | Logika auto-booking GOJEK |
| `src/lib/notifications.ts` | Pengiriman notifikasi WhatsApp/email |
| `src/lib/retryQueue.ts` | Mekanisme retry untuk booking gagal |
| `src/lib/store.ts` | Zustand store — cart, alamat, state global |
| `src/middleware.js` | Middleware auth — proteksi route checkout |

---

## 🔴 Bug Kritis (Critical)

### BUG-1: Booking Biteship Terjadi SEBELUM Pembayaran Dikonfirmasi (Race Condition) ✅ SUDAH DIPERBAIKI

**Lokasi:** `src/components/CheckoutView.tsx` baris 643–663 (diperbaiki)

Booking kurir Biteship (`POST /api/shipping/biteship/book`) **dipindahkan** dari checkout ke **setelah** pembayaran dikonfirmasi.

**Perbaikan yang Diterapkan:**

1. **CheckoutView.tsx** — fire-and-forget booking **dihapus** sepenuhnya dari `handlePayment()`. Checkout hanya membuat order dan redirect ke payment gateway.

2. **`src/lib/confirmOrderPayment.ts`** — ditambahkan fungsi `bookBiteshipIfNeeded()` yang dipanggil **setelah** pembayaran dikonfirmasi (di webhook handler):
   - Cek `courier_details` untuk determine apakah order menggunakan kurir Biteship
   - Jika ya, panggil `createBiteshipOrder()` dengan data order yang sudah terverifikasi
   - Update `courier_details` dengan `biteship_order_id`, `waybill_id`, `tracking_id`, dll
   - Idempoten: cek `biteship_order_id` sudah ada sebelum booking ulang

3. **`src/pages/api/payment/webhook.ts`** — ditambahkan cancel logic:
   - Jika payment status `cancel`/`expire`/`deny`, cek `courier_details.biteship_order_id`
   - Jika ada, panggil `cancelBiteshipOrder()` ke Biteship API
   - Update `courier_details` untuk menghapus `biteship_order_id` dan set `shipping_status: "cancelled"`

4. **`src/lib/gojekAutoBooking.ts`** — ditambahkan idempotency check:
   - Jika `biteship_order_id` sudah ada, return early tanpa booking ulang
   - Mencegah duplikat order Biteship untuk GOJEK

**Flow Baru:**
```
1. Customer klik bayar → order dibuat (status: awaiting_payment)
2. Redirect ke Midtrans Snap
3. Webhook Midtrans → confirmOrderPayment() → status jadi "paid"
4. confirmOrderPayment() → bookBiteshipIfNeeded() → booking Biteship (setelah pembayaran confirmed)
5. Jika GOJEK → auto-book-gojek.ts (idempoten, skip jika sudah booked)
6. Jika payment gagal → webhook cancel → cancelBiteshipOrder()
```

---

### BUG-2: ✅ FIXED — Auto-Book GOJEK Menciptakan Duplikat Order Biteship

**Lokasi:** `src/components/CheckoutView.tsx` baris 643–663 (dihapus); `src/lib/gojekAutoBooking.ts` baris 28–30 (ditambahkan idempotency check)

**Perbaikan yang Diterapkan:**

1. **Booking awal di checkout DIHAPUS** — tidak ada lagi fire-and-forget booking sebelum pembayaran
2. **Booking dilakukan di `confirmOrderPayment.ts`** — setelah pembayaran dikonfirmasi oleh webhook Midtrans
3. **`gojekAutoBooking.ts` ditambahkan idempotency check** — jika `biteship_order_id` sudah ada, skip booking:
   ```typescript
   const cd = order.courier_details || {};
   if (cd.biteship_order_id) {
     return { booked: true, reason: "Sudah pernah di-booking." };
   }
   ```

**Flow Baru (tanpa duplikat):**
```
1. Customer klik bayar → order dibuat (status: awaiting_payment)
2. Redirect ke Midtrans Snap
3. Webhook Midtrans → confirmOrderPayment() → status jadi "paid"
4. confirmOrderPayment() → bookBiteshipIfNeeded() → booking Biteship (SEMUA kurir, termasuk GOJEK)
5. Client onSuccess → auto-book-gojek.ts → cek biteship_order_id → SUDAH ADA → skip (tidak duplikat)
6. Jika payment gagal → webhook cancel → cancelBiteshipOrder()
```

---

### BUG-3: ✅ FIXED — Webhook Biteship Menangani Semua Event Type

**Lokasi:** `src/pages/api/shipping/biteship/webhook.ts`

Berdasarkan [dokumentasi Biteship](https://biteship.com/en/docs/api/webhook/overview), webhook mendukung 3 event type:

| Event | Deskripsi | Ditangani? |
|-------|-----------|:----------:|
| `order.status` | Perubahan status pengiriman | ✅ Ya |
| `order.waybill_id` | Penerbitan nomor resi | ✅ Ya |
| `order.price` | Perubahan harga pengiriman | ✅ Ya |

**Perbaikan yang Diterapkan:**

Webhook handler sekarang membaca field `event` dari payload dan menangani masing-masing event type:

```typescript
const event = body.event || "order.status";
const biteshipOrderId = body.order_id;

// Handle order.price — update harga di courier_details
if (event === "order.price") {
  const newPrice = body.price;
  if (typeof newPrice === "number") {
    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...cd,
          price: newPrice,
        },
      })
      .eq("id", o.id);
  }
  return new Response("OK", { status: 200 });
}

// Handle order.waybill_id — update waybill_id
if (event === "order.waybill_id") {
  const newWaybill = body.waybill_id || body.courier_waybill_id || "";
  if (newWaybill) {
    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...cd,
          waybill_id: newWaybill,
        },
      })
      .eq("id", o.id);
  }
  return new Response("OK", { status: 200 });
}

// Handle order.status — update shipping_status + waybill_id + notifikasi WA
// (existing logic)
```

---

### BUG-4: ✅ FIXED — Cancel Biteship Order Saat Order Dibatalkan

**Lokasi:** `src/pages/api/payment/webhook.ts` baris 83–99; `src/lib/biteship.ts`

**Perbaikan yang Diterapkan:**

Ditambahkan cancel logic di webhook handler untuk status `cancel`, `expire`, dan `deny`:

```typescript
// webhook.ts — saat payment dibatalkan
const cd = orderData.courier_details || {};
const biteshipOrderId = cd.biteship_order_id;
if (biteshipOrderId) {
  try {
    await cancelBiteshipOrder(biteshipOrderId);  // ← baru
    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...cd,
          biteship_order_id: null,
          shipping_status: "cancelled",
        },
      })
      .eq("id", orderData.id);
  } catch (cancelErr) {
    console.error(`[Biteship] Gagal cancel order ${biteshipOrderId}:`, cancelErr);
  }
}
```

Fungsi `cancelBiteshipOrder()` ditambahkan di `biteship.ts`:
```typescript
export async function cancelBiteshipOrder(orderId: string): Promise<void> {
  await biteshipRequest("POST", `/v1/orders/${encodeURIComponent(orderId)}/cancel`, {});
}
```

---

### BUG-5: ✅ FIXED — Tidak Ada Auth Check di `auto-book-gojek.ts`

**Lokasi:** `src/pages/api/shipping/biteship/auto-book-gojek.ts`

Endpoint `POST /api/shipping/biteship/auto-book-gojek` **tidak memeriksa session atau otorisasi** siapa pun. Siapa pun bisa memanggil endpoint ini dan memicu auto-booking untuk order mana pun.

**Perbaikan yang Diterapkan:**

Ditambahkan auth check yang sama seperti di `book.ts`:

```typescript
export const POST: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }
  // ... lanjut proses auto-booking
};
```

Sekarang endpoint hanya bisa diakses oleh customer yang sudah login.

### BUG-5: ✅ FIXED — `verifyBiteshipWebhook` — Verifikasi Signature Distandarisasi

**Lokasi:** `src/lib/biteship.ts` baris 259–294

**Perbaikan yang Diterapkan:**

1. **Hapus mode perbandingan langsung** — tidak ada lagi `constantTimeEqual(signature, WEBHOOK_SECRET)`
2. **Hanya pakai HMAC-SHA256** — verifikasi menggunakan `crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex")`
3. **Gunakan `crypto.timingSafeEqual`** — built-in Node.js constant-time comparison, menggantikan custom `constantTimeEqual` yang memiliki early return
4. **Validasi panjang signature** — cek `sigBuf.length !== expBuf.length` sebelum comparison

```typescript
export function verifyBiteshipWebhook(
  headers: Headers,
  rawBody: string,
): boolean {
  if (!WEBHOOK_SECRET) return false;

  const signature = headers.get(WEBHOOK_KEY);
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expBuf.length) return false;

  try {
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
```

**Keamanan yang diperbaiki:**
- Tidak ada lagi mode yang membandingkan signature dengan raw secret
- Menggunakan `crypto.timingSafeEqual` yang immune terhadap timing attacks
- Tidak ada early return berdasarkan panjang di loop comparison

---

## 🟡 Bug Sedang (Medium)

### BUG-6: `book.ts` — Retry Logic Tidak Mempertahankan `routing_code`

**Lokasi:** `src/pages/api/shipping/biteship/book.ts` baris 169–183

Pada retry logic (catch block), update `courier_details` **tidak menyertakan** `routing_code`, padahal di main flow (baris 108) `routing_code` disertakan.

```diff
// Main flow (baris 108) — routing_code disertakan
routing_code: result.routingCode,

// Retry flow (baris 178) — routing_code TIDAK disertakan
```

**Dampak:** Jika booking gagal dan retry berhasil, `routing_code` akan hilang dari `courier_details`, yang bisa menyebabkan masalah pada generate shipping label dan tracking.

---

### BUG-7: ✅ FIXED — `book.ts` — Validasi Status Order Sebelum Booking

**Lokasi:** `src/pages/api/shipping/biteship/book.ts`

Ditambahkan validasi status order sebelum membuat booking Biteship:

```typescript
const validStatuses = ["awaiting_payment", "paid", "processing"];
if (!validStatuses.includes(order.status)) {
  return new Response(
    JSON.stringify({ message: `Order dalam status "${order.status}" tidak valid untuk booking.` }),
    { status: 422 },
  );
}
```

Booking hanya diperbolehkan untuk order dengan status: `awaiting_payment`, `paid`, atau `processing`.

---

### BUG-8: ✅ FIXED — `createBiteshipOrder` — Menyimpan `delivery` Info dari Response

**Lokasi:** `src/lib/biteship.ts` baris 115–168

Response dari `POST /v1/orders` mengandung field `delivery` yang berisi `datetime`, `type`, `distance`, `distance_unit`. Fungsi `createBiteshipOrder` sekarang **menyimpan** informasi ini:

```typescript
export interface BiteshipOrderResult {
  id: string;
  waybillId: string;
  trackingId: string;
  routingCode: string;
  status: string;
  price: number;
  delivery?: {
    datetime: string;
    type: string;
    distance: number;
    distance_unit: string;
  };
}

// Di createBiteshipOrder():
return {
  id: json.id,
  waybillId: json.courier?.waybill_id || "",
  trackingId: json.courier?.tracking_id || "",
  routingCode: json.courier?.routing_code || "",
  status: json.status,
  price: json.price,
  delivery: json.delivery
    ? {
        datetime: json.delivery.datetime || "",
        type: json.delivery.type || "",
        distance: json.delivery.distance || 0,
        distance_unit: json.delivery.distance_unit || "",
      }
    : undefined,
};
```

---

### BUG-9: ✅ FIXED — `getBiteshipRates` dan `createBiteshipOrder` — Dimensions Menjadi Configurable

**Lokasi:** `src/lib/biteship.ts` baris 42–89 (rates) dan 94–168 (order)

Dimensions item tidak lagi di-hardcode. Sekarang menjadi optional parameter dengan fallback ke 10:

```typescript
// getBiteshipRates — params sekarang menerima optional dimensions
export async function getBiteshipRates(params: {
  destination: { ... };
  weight: number;
  couriers?: string;
  value?: number;
  length?: number;      // ← baru
  width?: number;       // ← baru
  height?: number;      // ← baru
})

// createBiteshipOrder — items interface sekarang menerima optional dimensions
items: { name: string; description: string; quantity: number; weight: number; value: number; length?: number; width?: number; height?: number }[];

// Di createBiteshipOrder():
items: p.items.map((it) => ({
  ...
  length: it.length || 10,   // fallback ke 10
  width: it.width || 10,      // fallback ke 10
  height: it.height || 10,    // fallback ke 10
})),
```

**Catatan:** Kolom `length`, `width`, `height` belum ada di tabel `products`. Saat ini menggunakan default 10. Ketika kolom tersebut ditambahkan ke database, dimensions bisa langsung diteruskan dari data produk.

---

### BUG-10: ✅ FIXED — `searchBiteshipAreas` — Field Mapping Distandarisasi

**Lokasi:** `src/lib/biteship.ts` baris 201–235

Field mapping telah distandarisasi menggunakan `??` (nullish coalescing) dan ditambahkan logging untuk area yang tidak ter-mapping dengan benar:

```typescript
const mapped: BiteshipAreaResult = {
  id: String(area.id ?? area.area_id ?? ""),
  name: area.name ?? area.area_name ?? "",
  type: area.type ?? "",
  country: area.country ?? "",
  administrativeLevel1: area.administrative_level_1_name ?? area.province_name ?? "",
  administrativeLevel2: area.administrative_level_2_name ?? area.city_name ?? "",
  administrativeLevel3: area.administrative_level_3_name ?? area.district_name ?? "",
  administrativeLevel4: area.administrative_level_4_name ?? area.subdistrict_name ?? "",
  latitude: String(area.latitude ?? area.lat ?? ""),
  longitude: String(area.longitude ?? area.lng ?? ""),
  postalCode: area.postal_code ? String(area.postal_code) : area.zip_code ?? undefined,
};

if (!mapped.id || !mapped.name) {
  console.warn("[Biteship] Area mapping issue:", JSON.stringify(area));
}
```

**Perbaikan:**
- Mengganti `||` dengan `??` untuk menghindari falsy values seperti `0` atau empty string
- Menambahkan logging untuk area dengan `id` atau `name` yang tidak ter-mapping
- Standarisasi field names sesuai dokumentasi API Biteship terbaru

---

## 🟢 Bug Kecil (Minor)

### BUG-11: ✅ FIXED — Webhook Tidak Memfilter Berdasarkan `event` Type

**Lokasi:** `src/pages/api/shipping/biteship/webhook.ts`

Webhook sekarang membaca field `event` dari payload dan menangani masing-masing event type:

- `order.status` → update `shipping_status` + notifikasi WhatsApp
- `order.waybill_id` → update `waybill_id`
- `order.price` → update `price`

Ini sudah diperbaiki bersamaan dengan BUG #3.

---

### BUG-12: ✅ FIXED — `pollOrderStatus` — Sekarang Handle Status Selain "paid"

**Lokasi:** `src/components/CheckoutView.tsx` baris 561–583

Polling sekarang menangani semua status pembayaran:

```typescript
if (data.status === "paid") {
  clearInterval(interval);
  setIsPolling(false);
  clearCart();
  window.location.href = `/akun/pesanan/${orderId}?status=success`;
} else if (["cancelled", "expired", "denied", "failed"].includes(data.status)) {
  clearInterval(interval);
  setIsPolling(false);
  setIsProcessingPayment(false);
  addToast({
    type: "error",
    message: data.status === "cancelled"
      ? "Pembayaran dibatalkan. Silakan coba lagi."
      : `Pembayaran gagal dengan status: ${data.status}.`,
  });
  window.location.href = `/akun/pesanan/${orderId}?status=${data.status}`;
}
```

**Status yang ditangani:**
- `paid` → redirect ke halaman success
- `cancelled`, `expired`, `denied`, `failed` → tampilkan error message + redirect ke halaman order dengan status gagal
- Lainnya → continue polling

---

### BUG-13: ✅ FIXED — Booking Biteship Fire-and-Forget Tanpa Feedback ke User

**Lokasi:** `src/components/CheckoutView.tsx` baris 644–663

Fire-and-forget booking **dihapus sepenuhnya** dari checkout sebagai bagian dari perbaikan BUG #1. Booking sekarang dilakukan di server-side (`confirmOrderPayment.ts`) setelah pembayaran dikonfirmasi. User tidak lagi melihat toast warning tentang booking gagal karena booking tidak lagi dilakukan di client-side.

---

### BUG-14: ✅ FIXED — `getBiteshipTracking` — Field Mapping Distandarisasi

**Lokasi:** `src/lib/biteship.ts` baris 233–245

Field mapping telah distandarisasi menggunakan `??` (nullish coalescing):

```typescript
const history = (json.history || []).map((h: any) => ({
  status: h.status ?? "",
  note: h.note ?? h.description ?? "",
  timestamp: h.timestamp ?? h.created_at ?? "",
  location: h.location ?? h.city ?? undefined,
}));
```

**Perbaikan:**
- Mengganti `||` dengan `??` untuk menghindari falsy values seperti `0` atau empty string
- `location` menggunakan `undefined` sebagai fallback terakhir daripada empty string

---

### BUG-15: ✅ FIXED — `courierDetails?.code` untuk "internal" Dikirim ke `book.ts`

**Lokasi:** `src/components/CheckoutView.tsx` baris 651

Fire-and-forget booking **dihapus sepenuhnya** dari checkout sebagai bagian dari perbaikan BUG #1. Tidak ada lagi pengiriman `courier_company` dari client-side ke `book.ts`. Booking sekarang dilakukan di server-side (`confirmOrderPayment.ts`) dengan validasi yang tepat.

---

## ⚠️ Gaps Arsitektural

### GAP-1: ✅ FIXED — Idempotency pada Booking Biteship

**Perbaikan yang Diterapkan:**

1. **`book.ts`** — ditambahkan check `existing.biteship_order_id` sebelum booking:
   ```typescript
   const existing = order.courier_details || {};
   if (existing.biteship_order_id) {
     return new Response(JSON.stringify({
       message: "Order ini sudah pernah dibooking ke Biteship.",
       waybill_id: existing.waybill_id,
       tracking_id: existing.tracking_id,
       status: existing.shipping_status,
       price: existing.price,
     }), { status: 200 });
   }
   ```

2. **`confirmOrderPayment.ts`** — `bookBiteshipIfNeeded()` sudah idempoten:
   ```typescript
   if (cd.biteship_order_id) return;  // skip jika sudah booked
   ```

3. **`gojekAutoBooking.ts`** — auto-book GOJEK juga idempoten:
   ```typescript
   if (cd.biteship_order_id) {
     return { booked: true, reason: "Sudah pernah di-booking." };
   }
   ```

---

### GAP-2: ✅ FIXED — Reconciliation Harga Setelah Booking

**Perbaikan yang Diterapkan:**

Ditambahkan price comparison di `book.ts` setelah booking berhasil:
```typescript
const quotedPrice = Number(order.shipping_cost || 0);
const actualPrice = Number(result.price || 0);
if (quotedPrice > 0 && Math.abs(quotedPrice - actualPrice) > 100) {
  console.warn(`[Biteship] Price mismatch for order ${order.order_number}: quoted=${quotedPrice}, actual=${actualPrice}`);
}
```

Selisih harga > Rp 100 akan di-log sebagai warning untuk admin.

---

### GAP-3: ✅ FIXED — Notifikasi Admin Jika Booking Gagal

**Perbaikan yang Diterapkan:**

1. **`retryQueue.ts`** — ditambahkan `onFinalFailure` callback:
   ```typescript
   type Task = {
     ...
     onFinalFailure?: (error: unknown) => void;
   };
   ```

2. **`notifications.ts`** — ditambahkan template `booking_failed`:
   ```typescript
   booking_failed: {
     whatsapp: (d) => `⚠️ Gagal Booking Biteship\n\nOrder: ${d.orderNumber}\nKurir: ${d.courierName}\nAlasan: ${d.reason}\n\nSegera proses order ini secara manual.`,
     email: { ... }
   }
   ```

3. **`book.ts`** — kirim notifikasi WA ke admin jika retry habis:
   ```typescript
   onFinalFailure: async (retryErr) => {
     const reason = retryErr instanceof Error ? retryErr.message : "Unknown error";
     await sendOrderNotification({
       to: import.meta.env.STORE_PHONE || "+6288101169213",
       channel: "whatsapp",
       event: "booking_failed",
       data: { orderNumber, courierName, reason, ... }
     });
   }
   ```

---

### GAP-4: ⚠️ PARTIAL — `courier_details` Structure Tidak Distandarisasi

**Status:** Partial — belum dilakukan migration database, tapi code sudah lebih konsisten.

**Perbaikan yang Sudah Diterapkan:**

Semua update `courier_details` sekarang menggunakan spread operator untuk mempertahankan field existing:
```typescript
courier_details: {
  ...cd,  // preserve existing fields
  biteship_order_id: result.id,
  waybill_id: result.waybillId,
  tracking_id: result.trackingId,
  routing_code: result.routingCode,
  shipping_status: result.status,
  courier_company: courierCompany,
  courier_service_code: courierServiceCode,
}
```

**Yang Belum:**
- Belum ada migration untuk mendefinisikan schema `courier_details` sebagai JSONB dengan validasi
- Belum ada TypeScript interface yang strict untuk `courier_details`
- Field `delivery` dari Biteship belum disimpan

**Rekomendasi Lanjutan:**
- Buat migration untuk normalisasi `courier_details` ke schema yang konsisten
- Tambahkan TypeScript interface `CourierDetails` dan gunakan di semua query
- Simpan `delivery` info dari Biteship ke `courier_details`

---

## ✅ Bagian yang Sudah Benar

1. **Webhook verification** — memiliki dua mode verifikasi (meskipun mode utama kurang aman)
2. **Auth check** di `book.ts` — memverifikasi session dan kepemilikan order
3. **Retry mechanism** di `book.ts` — menggunakan `scheduleRetry` untuk retry booking
4. **Webhook handler** — memperbarui `waybill_id` dan `shipping_status` di database
5. **Notification** — webhook mengirim notifikasi WhatsApp ke customer saat status berubah
6. **Rate caching** — `rates.ts` memiliki cache 5 menit untuk mengurangi API calls
7. **Schedule filtering** — `CheckoutView.tsx` menyaring kurir yang di luar jam operasional
8. **Stock validation** — `create-transaction.ts` memvalidasi stok sebelum membuat order
9. **Voucher validation** — server-side re-validation di `create-transaction.ts`
10. **Customer auth check** — `book.ts` memverifikasi bahwa order milik customer yang sedang login

---

## 📦 Flow Non-GOJEK (POS, JNE, JNT, JNT Cargo)

Kurir non-GOJEK yang terintegrasi Biteship: **POS Indonesia**, **JNE**, **J&T Express**, **J&T Cargo**.

### Konfigurasi Schedule (Bug Kritis — Non-Instant Courier Tersalah Difilter) ✅ SUDAH DIPERBAIKI

POS Indonesia, JNE, J&T Express, J&T Cargo adalah **non-instant courier**. Mereka **tidak memerlukan** `open_time`/`cutoff_time` karena order bisa dipick-up dan dikirim hari esok, meskipun customer order di malam hari.

**Perbaikan yang Diterapkan:**

Di `CheckoutView.tsx` baris 208–243, tiga fungsi telah diperbaiki:

```typescript
const isWithinSchedule = (code: string) => {
  if (!courierConfig) return true;
  const normalized = String(code || "").toLowerCase();
  if (["pos", "jne", "jnt", "jntcargo"].includes(normalized)) return true; // ← NON-INSTANT ALWAYS TRUE
  const schedule = normalized === "internal" ? courierConfig.bjs_express : courierConfig.gojek;
  ...
};

const getScheduleLabel = (code: string) => {
  if (!courierConfig) return "";
  const normalized = String(code || "").toLowerCase();
  if (["pos", "jne", "jnt", "jntcargo"].includes(normalized)) return ""; // ← NO LABEL FOR NON-INSTANT
  ...
};

const getScheduleReason = (code: string) => {
  if (!courierConfig) return "";
  const normalized = String(code || "").toLowerCase();
  if (["pos", "jne", "jnt", "jntcargo"].includes(normalized)) return ""; // ← NO REASON FOR NON-INSTANT
  ...
};
```

**Dampak Sebelum:**
- `getScheduleLabel("pos")` menampilkan "08:00 - 18:00 WIB" (schedule GOJEK) — misleading
- `isWithinSchedule("pos")` menggunakan schedule GOJEK — meskipun filter saat ini hanya dipanggil untuk `gojek` dan `internal`

**Dampak Sesudah:**
- POS/JNE/JNT/JNT Cargo **always available** — tidak ada schedule check
- Tidak ada label schedule yang menyesatkan di UI
- GOJEK dan BJS Express tetap menggunakan schedule respective mereka

### Flow Booking

Non-GOJEK kurir tidak memiliki **auto-book** step. Flow-nya sama dengan GOJEK tetapi tanpa langkah tambahan:

```
1. Customer pilih kurir non-GOJEK (POS/JNE/JNT/JNT Cargo)
2. Customer klik "Lanjut ke Pembayaran" → handlePayment()
3. POST /api/payment/create-transaction → buat order (status: awaiting_payment)
4. POST /api/shipping/biteship/book (fire-and-forget) ← SAMA seperti GOJEK
5. Redirect ke Midtrans Snap
6. Webhook Midtrans → confirmOrderPayment() → status jadi "paid"
7. Biteship webhook → update shipping_status
8. Tracking → GET /api/shipping/biteship/track
```

Tidak ada step `auto-book-gojek.ts` untuk non-GOJEK.

### Struktur `courier_details` untuk Non-GOJEK

| Waktu | Field yang Tersimpan |
|-------|---------------------|
| Setelah `create-transaction` | `{ code, name, service, courier_service_code, etd }` |
| Setelah `book.ts` | `{ ..., biteship_order_id, waybill_id, tracking_id, routing_code, shipping_status, courier_company, courier_service_code }` |

`courier_company` diisi dengan kode kurir (`pos`, `jne`, `jnt`, `jntcargo`) dari `courierDetails?.code`.

### Bug yang Berdampak pada Non-GOJEK

Bug yang sama mempengaruhi non-GOJEK karena menggunakan endpoint yang sama:

| Bug | Dampak pada Non-GOJEK |
|-----|----------------------|
| BUG-1 | ✅ Fixed — booking dipindah ke setelah pembayaran + cancel saat gagal |
| BUG-4 | ✅ Fixed — cancel Biteship order saat payment dibatalkan |
| BUG-6 | ⚠️ Partial — retry logic masih tidak mempertahankan `routing_code` |
| BUG-7 | ✅ Fixed — validasi status order sebelum booking |
| BUG-8 | ✅ Fixed — `delivery` info disimpan di `BiteshipOrderResult` |
| **FIXED** | **Kurir non-instant (POS/JNE/JNT/JNT Cargo) selalu available — tidak difilter schedule GOJEK** |
| GAP-1 | ✅ Fixed — idempotency check di `book.ts` dan `confirmOrderPayment.ts` |
| GAP-4 | ⚠️ Partial — code lebih konsisten, tapi belum ada migration DB |

### Bug yang Tidak Berlaku untuk Non-GOJEK

| Bug | Alasan Tidak Berlaku |
|-----|---------------------|
| BUG-2 (duplikat order) | Non-GOJEK tidak memiliki auto-book step, jadi tidak ada duplikat |
| BUG-5 (auth check auto-book-gojek) | Endpoint `auto-book-gojek.ts` hanya untuk GOJEK |

### File yang Terlibat

| File | Peran untuk Non-GOJEK |
|------|----------------------|
| `src/components/CheckoutView.tsx` | Schedule check menggunakan `courierConfig.gojek` untuk semua non-GOJEK |
| `src/pages/api/shipping/biteship/book.ts` | Booking endpoint — tidak membedakan GOJEK vs non-GOJEK |
| `src/pages/api/shipping/biteship/webhook.ts` | Webhook handler — sama untuk semua kurir Biteship |
| `src/pages/api/shipping/biteship/rates.ts` | Rates endpoint — mengembalikan service codes untuk setiap kurir |
| `src/lib/biteship.ts` | `createBiteshipOrder` menerima `courierCompany` dan `courierType` |

---

## 📊 Ringkasan Prioritas

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | ✅ Fixed | Booking Biteship dipindah ke setelah pembayaran dikonfirmasi + cancel saat payment gagal | `confirmOrderPayment.ts`, `webhook.ts` |
| 2 | ✅ Fixed | Auto-book GOJEK sekarang idempoten — tidak ada duplikat order Biteship | `gojekAutoBooking.ts` |
| 3 | ✅ Fixed | Webhook sekarang menangani semua event type (status, waybill_id, price) | `webhook.ts` |
| 4 | ✅ Fixed | Cancel Biteship order saat payment cancel/expire/deny — ditambahkan di webhook.ts | `webhook.ts`, `biteship.ts` |
| 5 | ✅ Fixed | Auth check ditambahkan ke `auto-book-gojek.ts` — hanya customer login yang bisa trigger | `auto-book-gojek.ts` |
| 6 | ✅ Fixed | Kurir non-instant (POS/JNE/JNT/JNT Cargo) selalu available — tidak difilter schedule GOJEK | `CheckoutView.tsx` |
| 7 | ✅ Fixed | Webhook signature verification distandarisasi — HMAC-SHA256 only + timingSafeEqual | `biteship.ts` |
| 8 | 🟡 Medium | Retry logic book.ts tidak mempertahankan routing_code | `book.ts` |
| 9 | ✅ Fixed | Validasi status order sebelum booking — hanya `awaiting_payment`, `paid`, `processing` | `book.ts` |
| 10 | ✅ Fixed | `createBiteshipOrder` sekarang menyimpan `delivery` info dari response | `biteship.ts` |
| 11 | ✅ Fixed | Item dimensions menjadi configurable — `length`/`width`/`height` optional dengan fallback 10 | `biteship.ts` |
| 12 | ✅ Fixed | searchBiteshipAreas field mapping distandarisasi + logging untuk unmapped fields | `biteship.ts` |
| 13 | ✅ Fixed | Webhook sekarang memfilter dan menangani semua event type | `webhook.ts` |
| 14 | ✅ Fixed | pollOrderStatus sekarang handle semua status pembayaran | `CheckoutView.tsx` |
| 15 | ✅ Fixed | Booking fire-and-forget dihapus — booking dipindah ke server-side | `CheckoutView.tsx` |
| 16 | ✅ Fixed | getBiteshipTracking field mapping distandarisasi dengan `??` | `biteship.ts` |
| 17 | ✅ Fixed | courierDetails.code "internal" tidak lagi dikirim ke book.ts | `CheckoutView.tsx` |
| GAP-1 | ✅ Fixed | Idempotency booking — cek `biteship_order_id` sebelum booking | `book.ts`, `confirmOrderPayment.ts` |
| GAP-2 | ✅ Fixed | Price reconciliation — log warning jika selisih harga > Rp 100 | `book.ts` |
| GAP-3 | ✅ Fixed | Notifikasi admin WhatsApp jika booking gagal permanen | `book.ts`, `retryQueue.ts`, `notifications.ts` |
| GAP-4 | ⚠️ Partial | `courier_details` structure belum distandarisasi di DB, tapi code sudah lebih konsisten | `book.ts`, `confirmOrderPayment.ts` |

---

## 📎 Referensi

- [Biteship API — Create Order](https://biteship.com/en/docs/api/orders/create)
- [Biteship API — Orders Overview](https://biteship.com/en/docs/api/orders/overview)
- [Biteship API — Webhook Overview](https://biteship.com/en/docs/api/webhook/overview)
- [Biteship Webhook — Complete Guide](https://help.biteship.com/hc/en-us/articles/58382055713689-Complete-Guide-to-Understanding-Biteship-Webhooks)
- [Biteship API Reference](https://biteship.com/en/docs/api)

---

*Laporan audit ini dibuat berdasarkan analisis kode sumber dan dokumentasi Biteship API. Temuan ini perlu diverifikasi oleh tim pengembang sebelum implementasi perbaikan.*