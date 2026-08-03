// File: src/lib/gojekAutoBooking.ts
// Auto-booking GOJEK untuk order yang memenuhi syarat before 15:00 WIB.
import { supabaseAdmin } from "./supabaseServer";

const CUT_OFF_HOUR = Number(import.meta.env.GOJEK_CUTOFF_HOUR || 15);

function isBeforeCutOff(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const jakartaOffset = 7 * 60;
  const createdLocal = new Date(created.getTime() + jakartaOffset * 60 * 1000);
  const nowLocal = new Date(now.getTime() + jakartaOffset * 60 * 1000);
  return createdLocal.getHours() < CUT_OFF_HOUR;
}

export async function processGojekAutoBooking(orderId: string): Promise<{ booked: boolean; reason?: string }> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, created_at, courier_details, shipping_address, customer_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return { booked: false, reason: "Order tidak ditemukan." };
  }

  const cd = order.courier_details || {};
  if (cd.biteship_order_id) {
    return { booked: true, reason: "Sudah pernah di-booking." };
  }
  if (cd.courier_company?.toLowerCase() !== "gojek" && cd.code?.toLowerCase() !== "gojek") {
    return { booked: false, reason: "Bukan kurir GOJEK." };
  }

  if (!isBeforeCutOff(order.created_at)) {
    return { booked: false, reason: `Order dibuat setelah pukul ${String(CUT_OFF_HOUR).padStart(2, "0")}:00 WIB.` };
  }

  const addr = order.shipping_address;
  if (!addr?.latitude || !addr?.longitude) {
    return { booked: false, reason: "Alamat belum memiliki koordinat." };
  }

  const { data: area } = await supabaseAdmin
    .from("gojek_service_areas")
    .select("id")
    .eq("subdistrict_id", addr.destination)
    .eq("is_active", true)
    .maybeSingle();

  if (!area) {
    return { booked: false, reason: "Alamat di luar area layanan GOJEK." };
  }

  try {
    const { createBiteshipOrder } = await import("./biteship.ts");
    const origin = {
      contactName: import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
      contactPhone: import.meta.env.BITESHIP_ORIGIN_PHONE || "",
      address: import.meta.env.BITESHIP_ORIGIN_ADDRESS || "",
      postalCode: import.meta.env.BITESHIP_ORIGIN_POSTAL || "",
      latitude: Number(import.meta.env.BITESHIP_ORIGIN_LAT || 0),
      longitude: Number(import.meta.env.BITESHIP_ORIGIN_LNG || 0),
    };

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("nama_pelanggan, telepon")
      .eq("id", order.customer_id)
      .single();

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("quantity, products(*)")
      .eq("order_id", orderId);

    const mappedItems = (items || []).map((it: any) => ({
      name: it.products?.nama || "Item BJS",
      description: "Pesanan BJS Racing",
      quantity: it.quantity,
      weight: it.products?.berat_gram || 500,
      value: 0,
    }));

    const result = await createBiteshipOrder({
      referenceId: order.order_number,
      origin,
      destination: {
        contactName: addr.recipient_name || customer?.nama_pelanggan || "",
        contactPhone: addr.recipient_phone || customer?.telepon || "",
        address: addr.full_address || "",
        postalCode: addr.postal_code || "",
        latitude: Number(addr.latitude),
        longitude: Number(addr.longitude),
      },
      courierCompany: "gojek",
      courierType: cd.courier_service_code || "GOSEND",
      deliveryType: "now",
      items: mappedItems,
    });

    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...cd,
          biteship_order_id: result.id,
          waybill_id: result.waybillId,
          tracking_id: result.trackingId,
          routing_code: result.routingCode,
          shipping_status: result.status,
        },
      })
      .eq("id", orderId);

    return { booked: true };
  } catch (err) {
    return { booked: false, reason: err instanceof Error ? err.message : "Gagal booking GOJEK." };
  }
}
