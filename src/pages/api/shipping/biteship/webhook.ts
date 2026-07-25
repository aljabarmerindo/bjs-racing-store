// File: src/pages/api/shipping/biteship/webhook.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { verifyBiteshipWebhook } from "@/lib/biteship.ts";

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
      .select("id, courier_details")
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
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Biteship] webhook error:", error);
    return new Response("OK", { status: 200 });
  }
};
