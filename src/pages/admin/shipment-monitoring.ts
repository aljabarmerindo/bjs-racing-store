// File: src/pages/admin/shipment-monitoring.tsx
// Admin dashboard monitoring shipment.
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, created_at, courier_details, total, status")
    .not("courier_details", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const shipments = (orders || []).map((o: any) => {
    const cd = o.courier_details || {};
    return {
      id: o.id,
      order_number: o.order_number,
      created_at: o.created_at,
      courier: cd.courier_company || cd.code || "-",
      service: cd.courier_service_code || cd.service || "-",
      waybill_id: cd.waybill_id || "-",
      tracking_id: cd.tracking_id || "-",
      shipping_status: cd.shipping_status || "-",
      total: o.total,
      order_status: o.status,
    };
  });

  return new Response(JSON.stringify(shipments), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
