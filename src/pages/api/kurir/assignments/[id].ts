// File: src/pages/api/kurir/assignments/[id].ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { requireCourier } from "@/lib/courierAuth.ts";

export const GET: APIRoute = async (context) => {
  const auth = await requireCourier(context);
  if (!auth.ok) {
    return new Response(JSON.stringify({ message: auth.message }), { status: auth.status });
  }

  const assignmentId = context.params.id;
  if (!assignmentId) {
    return new Response(JSON.stringify({ message: "ID penugasan wajib diisi." }), { status: 400 });
  }

  try {
    const { data: assignment, error } = await supabaseAdmin
      .from("courier_assignments")
      .select(`
        id,
        status,
        assigned_at,
        notes,
        photo_url,
        completed_at,
        courier_id,
        courier_assignment_events (id, status, note, created_at),
        orders (
          id,
          order_number,
          status,
          total_amount,
          shipping_cost,
          subtotal_products,
          courier_details,
          shipping_address,
          created_at,
          customers (id, nama_pelanggan, telepon),
          order_items (
            id,
            quantity,
            price,
            products (id, nama, kode, image_url, stok)
          )
        )
      `)
      .eq("id", assignmentId)
      .eq("courier_id", auth.courierId)
      .maybeSingle();

    if (error) throw error;
    if (!assignment) {
      return new Response(JSON.stringify({ message: "Penugasan tidak ditemukan." }), { status: 404 });
    }

    const a = assignment as any;
    const order = Array.isArray(a.orders) ? (a.orders[0] || {}) : (a.orders || {});
    const customer = Array.isArray(order.customers) ? (order.customers[0] || null) : (order.customers || null);
    const events = (a.courier_assignment_events || []).slice().sort(
      (x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime(),
    );
    return new Response(
      JSON.stringify({
        assignment_id: a.id,
        status: a.status,
        assigned_at: a.assigned_at,
        notes: a.notes,
        photo_url: a.photo_url,
        completed_at: a.completed_at,
        events,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_amount: order.total_amount,
          shipping_cost: order.shipping_cost,
          subtotal_products: order.subtotal_products,
          created_at: order.created_at,
          courier_details: order.courier_details || {},
          address: order.shipping_address || {},
          customer,
          items: Array.isArray(order.order_items) ? order.order_items : [],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Kurir assignment detail error:", err);
    return new Response(
      JSON.stringify({ message: "Gagal memuat detail penugasan." }),
      { status: 500 },
    );
  }
};
