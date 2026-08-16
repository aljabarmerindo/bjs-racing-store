// File: src/pages/api/kurir/assignments.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { requireCourier } from "@/lib/courierAuth.ts";

export const GET: APIRoute = async (context) => {
  const auth = await requireCourier(context);
  if (!auth.ok) {
    return new Response(JSON.stringify({ message: auth.message }), { status: auth.status });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("courier_assignments")
      .select(`
        id,
        status,
        assigned_at,
        notes,
        photo_url,
        completed_at,
        orders (
          id,
          order_number,
          status,
          total_amount,
          courier_details,
          shipping_address,
          customers (id, nama_pelanggan, telepon),
          order_items (quantity)
        )
      `)
      .eq("courier_id", auth.courierId)
      .order("assigned_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const result = (data || []).map((a: any) => {
      const order = Array.isArray(a.orders) ? (a.orders[0] || {}) : (a.orders || {});
      const customer = Array.isArray(order.customers) ? (order.customers[0] || null) : (order.customers || null);
      const addr = order.shipping_address || {};
      const items = Array.isArray(order.order_items) ? order.order_items : [];
      const itemCount = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
      return {
        assignment_id: a.id,
        status: a.status,
        assigned_at: a.assigned_at,
        notes: a.notes,
        photo_url: a.photo_url,
        completed_at: a.completed_at,
        order_id: order.id,
        order_number: order.order_number,
        order_status: order.status,
        total_amount: order.total_amount,
        courier_details: order.courier_details || {},
        customer,
        address: addr,
        item_count: itemCount,
      };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Kurir assignments error:", err);
    return new Response(
      JSON.stringify({ message: "Gagal memuat penugasan." }),
      { status: 500 },
    );
  }
};
