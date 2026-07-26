// File: src/pages/api/shipping/biteship/webhook.ts
// Webhook Biteship untuk update status tracking + notifikasi WA via FONNTE.
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { verifyBiteshipWebhook } from "@/lib/biteship.ts";
import { sendOrderNotification } from "@/lib/notifications.ts";

const SHIPPING_STATUS_LABEL: Record<string, string> = {
  pending: "menunggu",
  confirmed: "dikonfirmasi",
  scheduled: "dijadwalkan",
  allocated: "kurir dialokasikan",
  picking_up: "kurir menuju lokasi penjemputan",
  picked: "barang diambil kurir",
  in_transit: "dalam perjalanan",
  dropping_off: "sedang diantar",
  delivered: "tiba di tujuan",
  failed: "gagal",
  cancelled: "dibatalkan",
};

function normalizeStatus(status?: string): string {
  if (!status) return "sedang diproses";
  const key = String(status).toLowerCase().trim();
  return SHIPPING_STATUS_LABEL[key] || status;
}

export const POST: APIRoute = async (context) => {
  try {
    const raw = await context.request.text();
    const trimmed = raw.trim();

    if (!trimmed || trimmed === "{}") {
      return new Response("OK", { status: 200 });
    }

    if (!verifyBiteshipWebhook(context.request.headers, raw)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(trimmed);
    const biteshipOrderId = body.order_id;
    const status = body.status;
    const waybill = body.courier_waybill_id || body.waybill_id || "";

    if (!biteshipOrderId) {
      return new Response("OK", { status: 200 });
    }

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, courier_details, order_number, customer_id")
      .filter("courier_details->>biteship_order_id", "eq", biteshipOrderId);

    if (orders && orders.length > 0) {
      const o = orders[0];
      const cd = o.courier_details || {};
      await supabaseAdmin
        .from("orders")
        .update({
          courier_details: {
            ...cd,
            shipping_status: status,
            waybill_id: waybill || cd.waybill_id,
          },
        })
        .eq("id", o.id);

      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("nama_pelanggan, telepon")
        .eq("id", o.customer_id)
        .single();

      const phone = customer?.telepon || cd?.recipient_phone || "";
      if (phone) {
        void sendOrderNotification({
          to: phone,
          channel: "whatsapp",
          event: "shipping_status_update",
          data: {
            orderNumber: o.order_number,
            customerName: customer?.nama_pelanggan,
            trackingNumber: waybill || cd.waybill_id,
            shippingStatus: normalizeStatus(status),
            storeName: import.meta.env.STORE_NAME || "BJS Racing Store",
            storePhone: import.meta.env.STORE_PHONE || "+6288101169213",
          },
        }).catch((err: unknown) =>
          console.error("[Biteship] notifikasi gagal:", err),
        );
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Biteship] webhook error:", error);
    return new Response("OK", { status: 200 });
  }
};
