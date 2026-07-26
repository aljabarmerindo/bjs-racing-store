// File: src/pages/api/shipping/biteship/book.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { createBiteshipOrder } from "@/lib/biteship.ts";
import { requireAdmin } from "@/lib/adminAuth.ts";

const ORIGIN = {
  contactName: import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
  contactPhone: import.meta.env.BITESHIP_ORIGIN_PHONE || "",
  address: import.meta.env.BITESHIP_ORIGIN_ADDRESS || "",
  postalCode: import.meta.env.BITESHIP_ORIGIN_POSTAL || "",
  latitude: Number(import.meta.env.BITESHIP_ORIGIN_LAT || 0),
  longitude: Number(import.meta.env.BITESHIP_ORIGIN_LNG || 0),
};

export const POST: APIRoute = async (context) => {
  const auth = await requireAdmin(context);
  if (!auth.ok) {
    return new Response(JSON.stringify({ message: auth.message }), {
      status: auth.status,
    });
  }
  try {
    const { order_id, courier_company, courier_service_code } =
      await context.request.json();
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
    const addr = order.shipping_address;
    if (!addr?.latitude || !addr?.longitude) {
      return new Response(
        JSON.stringify({
          message:
            "Alamat customer belum memiliki koordinat (latitude/longitude). GoSend membutuhkan koordinat.",
        }),
        { status: 400 },
      );
    }

    const items = (order.order_items || []).map((it: any) => ({
      name: it.products?.nama || "Item BJS",
      description: "Pesanan BJS Racing",
      quantity: it.quantity,
      weight: it.products?.berat_gram || 500,
      value: Number(it.price) || 0,
    }));

    const result = await createBiteshipOrder({
      referenceId: order.order_number,
      origin: ORIGIN,
      destination: {
        contactName: addr.recipient_name || "",
        contactPhone: addr.recipient_phone || "",
        latitude: Number(addr.latitude),
        longitude: Number(addr.longitude),
        address: addr.full_address || "",
        postalCode: addr.postal_code || "",
      },
      courierCompany: courier_company || "gojek",
      courierType: courier_service_code,
      items,
    });

    const current = order.courier_details || {};
    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...current,
          biteship_order_id: result.id,
          waybill_id: result.waybillId,
          shipping_status: result.status,
        },
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({ waybill_id: result.waybillId, status: result.status }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        message:
          error instanceof Error ? error.message : "Gagal booking kurir.",
      }),
      { status: 500 },
    );
  }
};
