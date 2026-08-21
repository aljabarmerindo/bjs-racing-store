// File: src/pages/api/tracking/[orderNumber].ts
// Tracking publik: cek status pesanan via nomor pesanan (tanpa login).
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ params }) => {
  const orderNumber = (params.orderNumber || "").trim().toUpperCase();
  if (!orderNumber) {
    return new Response(JSON.stringify({ message: "Nomor pesanan wajib diisi." }), { status: 400 });
  }

  try {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_amount,
        subtotal_products,
        shipping_cost,
        notes,
        courier_details,
        shipping_address,
        created_at,
        delivered_at,
        customers (id, nama_pelanggan, telepon),
        order_items (id, quantity, price, products (id, nama, image_url))
      `)
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return new Response(JSON.stringify({ message: "Pesanan tidak ditemukan." }), { status: 404 });
    }

    const o = order as any;
    const cd = o.courier_details || {};
    const isInternal = cd.code === "internal";

    let assignment: any = null;
    if (isInternal) {
      const { data: asg, error: asgError } = await supabaseAdmin
        .from("courier_assignments")
        .select(`
          id,
          status,
          assigned_at,
          completed_at,
          photo_url,
          courier_assignment_events (id, status, note, created_at),
          couriers (id, name, phone)
        `)
        .eq("order_id", o.id)
        .maybeSingle();
      if (!asgError && asg) {
        const a = asg as any;
        const events = (a.courier_assignment_events || [])
          .slice()
          .sort(
            (x: any, y: any) =>
              new Date(x.created_at).getTime() - new Date(y.created_at).getTime(),
          );
        const courier = Array.isArray(a.couriers) ? (a.couriers[0] || null) : (a.couriers || null);
        assignment = {
          id: a.id,
          status: a.status,
          assigned_at: a.assigned_at,
          completed_at: a.completed_at,
          photo_url: a.photo_url,
          events,
          courier: courier ? { name: courier.name, phone: courier.phone } : null,
        };
      }
    }

    const customer = Array.isArray(o.customers) ? (o.customers[0] || null) : (o.customers || null);
    const addr = o.shipping_address || {};

    return new Response(
      JSON.stringify({
        order_number: o.order_number,
        status: o.status,
        created_at: o.created_at,
        delivered_at: o.delivered_at,
        courier_details: {
          code: cd.code || null,
          name: cd.name || null,
          shipping_status: cd.shipping_status || null,
          service_name: cd.service_name || null,
        },
        is_internal: isInternal,
        assignment,
        total_amount: o.total_amount,
        subtotal_products: o.subtotal_products,
        shipping_cost: o.shipping_cost,
        address: {
          recipient_name: addr.recipient_name,
          recipient_phone: addr.recipient_phone,
          full_address: addr.full_address,
          city_name: addr.city_name,
          subdistrict_name: addr.subdistrict_name,
          latitude: addr.latitude,
          longitude: addr.longitude,
        },
        customer: customer
          ? {
              nama_pelanggan: customer.nama_pelanggan,
              telepon: customer.telepon,
            }
          : null,
        items: (o.order_items || []).map((it: any) => ({
          nama: it.products?.nama || "Produk",
          image_url: it.products?.image_url || null,
          quantity: it.quantity,
          price: it.price,
        })),
        notes: o.notes || null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Tracking error:", err);
    return new Response(JSON.stringify({ message: "Gagal memuat tracking." }), { status: 500 });
  }
};
