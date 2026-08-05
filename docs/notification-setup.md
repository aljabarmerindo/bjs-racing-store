# Setup Notifikasi Otomatis

Layanan notifikasi telah disediakan di `/src/lib/notifications.ts` dan API endpoint di `/src/pages/api/notifications/send.ts`.

## Environment Variables yang Diperlukan

### WhatsApp (pilih salah satu provider)

#### Wablas
```env
WHATSAPP_PROVIDER=wablas
WABLAS_BASE_URL=https://your-wablas-instance.omnibox.web.id
WABLAS_API_KEY=your-wablas-api-key
```

#### WaAPI
```env
WHATSAPP_PROVIDER=waapi
WAAPI_BASE_URL=https://your-waapi-instance.com
WAAPI_API_KEY=your-waapi-api-key
```

### Email (opsional, menggunakan Resend)
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## CaraPakai

### 1. Kirim Notifikasi dari Frontend/Backend

```ts
import { sendOrderNotification } from "@/lib/notifications";

await sendOrderNotification({
  to: "6288101169213", // nomor WA atau email
  channel: "whatsapp", // atau "email"
  event: "order_created", // order_created | payment_confirmed | order_shipped | order_completed | order_cancelled
  data: {
    orderNumber: "ORD-001",
    customerName: "Budi",
    amount: 150000,
    storeName: "BJS Racing Store",
    storePhone: "0881011669213",
  },
});
```

### 2. Terapkan ke Alur Order

Tambahkan panggilan `sendOrderNotification` pada:
- `src/pages/api/payment/create-transaction.ts` — setelah order berhasil dibuat (`order_created`)
- `src/lib/confirmOrderPayment.ts` — setelah pembayaran dikonfirmasi (`payment_confirmed`)
- `src/pages/api/orders/[id]/ship.ts` — saat admin update resi/kurir (`order_shipped`)
- `src/pages/api/orders/[id]/complete.ts` — saat order selesai (`order_completed`)
- `src/pages/api/orders/[id]/cancel.ts` — saat order dibatalkan (`order_cancelled`)

### 3. Template Pesan

Semua template sudah didefinisikan di `src/lib/notifications.ts` pada objek `EVENT_TEMPLATES`.

Untuk menyesuaikan template, edit langsung di file tersebut.

### 4. Contoh Integrasi di create-transaction.ts

```ts
// Setelah order.insert().select().single()
await sendOrderNotification({
  to: customer.phone || customer.email,
  channel: "whatsapp",
  event: "order_created",
  data: {
    orderNumber: order.order_number,
    customerName: customer.name,
    amount: order.total_amount,
    storeName: "BJS Racing Store",
    storePhone: "0881011669213",
  },
});
```
