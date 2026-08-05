// File: src/pages/api/shipping/biteship/book.ts
// Booking order Biteship untuk customer checkout.
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { createBiteshipOrder } from "@/lib/biteship.ts";
import { getProductDimsCm, getProductWeightGram } from "@/lib/packageDimensions";
import { scheduleRetry } from "@/lib/retryQueue.ts";
import { sendOrderNotification } from "@/lib/notifications.ts";

const ORIGIN = {
  contactName: import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
  contactPhone: import.meta.env.BITESHIP_ORIGIN_PHONE || "",
  address: import.meta.env.BITESHIP_ORIGIN_ADDRESS || "",
  postalCode: import.meta.env.BITESHIP_ORIGIN_POSTAL || "",
  latitude: Number(import.meta.env.BITESHIP_ORIGIN_LAT || 0),
  longitude: Number(import.meta.env.BITESHIP_ORIGIN_LNG || 0),
};

export const POST: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }

  let order_id: string | null = null;
  let courier_company: string | null = null;
  let courier_service_code: string | null = null;

  try {
    const body = await context.request.json();
    order_id = body?.order_id || null;
    courier_service_code = body?.courier_service_code || null;
    courier_company = body?.courier_company || null;
    if (!order_id || !courier_service_code) {
      return new Response(
        JSON.stringify({ message: "order_id & courier_service_code wajib." }),
        { status: 400 },
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*, products(*))")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ message: "Order tidak ditemukan." }),
        { status: 404 },
      );
    }

    const validStatuses = ["awaiting_payment", "paid", "processing"];
    if (!validStatuses.includes(order.status)) {
      return new Response(
        JSON.stringify({ message: `Order dalam status "${order.status}" tidak valid untuk booking.` }),
        { status: 422 },
      );
    }

    const { data: customer, error: customerError } =
      await supabaseAdmin
        .from("customers")
        .select("nama_pelanggan, telepon, auth_user_id")
        .eq("id", order.customer_id)
        .single();

    if (customerError || !customer || customer.auth_user_id !== session.user.id) {
      return new Response(
        JSON.stringify({ message: "Anda tidak memiliki akses ke order ini." }),
        { status: 403 },
      );
    }

    const addr = order.shipping_address;
    if (!addr) {
      return new Response(
        JSON.stringify({ message: "Alamat pengiriman tidak ditemukan." }),
        { status: 400 },
      );
    }

    const existing = order.courier_details || {};
    if (existing.biteship_order_id) {
      return new Response(
        JSON.stringify({
          message: "Order ini sudah pernah dibooking ke Biteship.",
          waybill_id: existing.waybill_id,
          tracking_id: existing.tracking_id,
          status: existing.shipping_status,
          price: existing.price,
        }),
        { status: 200 },
      );
    }

    const items = (order.order_items || []).map((it: any) => {
      const dims = getProductDimsCm(it.products);
      return {
        name: it.products?.nama || "Item BJS",
        description: "Pesanan BJS Racing",
        quantity: it.quantity,
        weight: getProductWeightGram(it.products),
        value: Number(it.price) || 0,
        length: dims.length,
        width: dims.width,
        height: dims.height,
      };
    });

    const result = await createBiteshipOrder({
      referenceId: order.order_number,
      origin: ORIGIN,
      destination: {
        contactName: addr.recipient_name || customer.nama_pelanggan || "",
        contactPhone: addr.recipient_phone || customer.telepon || "",
        address: addr.full_address || "",
        postalCode: addr.postal_code || "",
        latitude: addr.latitude ? Number(addr.latitude) : undefined,
        longitude: addr.longitude ? Number(addr.longitude) : undefined,
      },
      courierCompany: courier_company || "gojek",
      courierType: courier_service_code,
      items,
    });

    const quotedPrice = Number(order.shipping_cost || 0);
    const actualPrice = Number(result.price || 0);
    if (quotedPrice > 0 && Math.abs(quotedPrice - actualPrice) > 100) {
      console.warn(`[Biteship] Price mismatch for order ${order.order_number}: quoted=${quotedPrice}, actual=${actualPrice}`);
    }

    const current = order.courier_details || {};
    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...current,
          biteship_order_id: result.id,
          waybill_id: result.waybillId,
          tracking_id: result.trackingId,
          routing_code: result.routingCode,
          shipping_status: result.status,
          courier_company: courier_company,
          courier_service_code: courier_service_code,
        },
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        waybill_id: result.waybillId,
        tracking_id: result.trackingId,
        status: result.status,
        price: result.price,
      }),
      { status: 200 },
    );
  } catch (error) {
    const capturedOrderId = order_id;
    const capturedCourierCompany = courier_company;
    scheduleRetry({
      maxRetries: 3,
      run: async () => {
        const { data: retryOrder } = await supabaseAdmin
          .from("orders")
          .select("*, order_items(*, products(*))")
          .eq("id", capturedOrderId)
          .single();

        if (!retryOrder) return;

        const { data: retryCustomer } = await supabaseAdmin
          .from("customers")
          .select("nama_pelanggan, telepon")
          .eq("id", retryOrder.customer_id)
          .single();

        const retryAddr = retryOrder.shipping_address;
        const retryItems = (retryOrder.order_items || []).map((it: any) => {
          const dims = getProductDimsCm(it.products);
          return {
            name: it.products?.nama || "Item BJS",
            description: "Pesanan BJS Racing",
            quantity: it.quantity,
            weight: getProductWeightGram(it.products),
            value: Number(it.price) || 0,
            length: dims.length,
            width: dims.width,
            height: dims.height,
          };
        });

        const result = await createBiteshipOrder({
          referenceId: retryOrder.order_number,
          origin: ORIGIN,
          destination: {
            contactName: retryAddr?.recipient_name || retryCustomer?.nama_pelanggan || "",
            contactPhone: retryAddr?.recipient_phone || retryCustomer?.telepon || "",
            address: retryAddr?.full_address || "",
            postalCode: retryAddr?.postal_code || "",
            latitude: retryAddr?.latitude ? Number(retryAddr.latitude) : undefined,
            longitude: retryAddr?.longitude ? Number(retryAddr.longitude) : undefined,
          },
          courierCompany: courier_company || "gojek",
          courierType: courier_service_code || "",
          items: retryItems,
        });

        const existingRetry = retryOrder.courier_details || {};
        await supabaseAdmin
          .from("orders")
          .update({
            courier_details: {
              ...existingRetry,
              biteship_order_id: result.id,
              waybill_id: result.waybillId,
              tracking_id: result.trackingId,
              routing_code: result.routingCode,
              shipping_status: result.status,
              courier_company: courier_company,
              courier_service_code: courier_service_code,
            },
          })
          .eq("id", order_id);
      },
      onFinalFailure: async (retryErr) => {
        const reason = retryErr instanceof Error ? retryErr.message : "Unknown error";
        console.error(`[Biteship] Booking gagal permanen untuk order ${capturedOrderId}:`, reason);
        try {
          await sendOrderNotification({
            to: import.meta.env.STORE_PHONE || "+62881011669213",
            channel: "whatsapp",
            event: "booking_failed",
            data: {
              orderNumber: capturedOrderId || undefined,
              courierName: capturedCourierCompany || undefined,
              reason,
              storeName: import.meta.env.STORE_NAME || "BJS Racing Store",
              storePhone: import.meta.env.STORE_PHONE || "+62881011669213",
            },
          });
        } catch (notifErr) {
          console.error("[Biteship] Gagal kirim notifikasi admin:", notifErr);
        }
      },
    });

    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Gagal booking kurir. Akan di-retry otomatis.",
      }),
      { status: 500 },
    );
  }
};
