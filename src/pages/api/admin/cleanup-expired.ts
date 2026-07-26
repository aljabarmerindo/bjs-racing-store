// File: src/pages/api/admin/cleanup-expired.ts
import type { APIRoute, APIContext } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { requireAdminOrServiceToken } from "@/lib/adminAuth.ts";

export const POST: APIRoute = async (context) => {
  return handleCleanup(context);
};

export const GET: APIRoute = async (context) => {
  return handleCleanup(context);
};

async function handleCleanup(context: APIContext) {
  const admin = await requireAdminOrServiceToken(context);
  if (!admin.ok) {
    return new Response(JSON.stringify({ message: admin.message }), {
      status: admin.status,
    });
  }

  try {
    const expiryHours = 24;
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - expiryHours);
    const cutoffIso = cutoff.toISOString();

    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status")
      .eq("status", "awaiting_payment")
      .lt("created_at", cutoffIso);

    if (fetchError) throw fetchError;

    const cancelledIds: string[] = [];
    for (const order of expiredOrders || []) {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)
        .eq("status", "awaiting_payment");

      if (updateError) {
        console.error(`Gagal cancel order ${order.order_number}:`, updateError);
        continue;
      }

      const { data: orderItems } = await supabaseAdmin
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        const productIds = orderItems.map((item) => item.product_id);
        const { data: activeFlashSales } = await supabaseAdmin
          .from("flash_sales")
          .select("id, product_id, stock_allocated")
          .in("product_id", productIds)
          .eq("is_active", true);

        for (const item of orderItems) {
          const flashSale = activeFlashSales?.find(
            (fs) => fs.product_id === item.product_id,
          );
          if (!flashSale) continue;
          const restoredStock = (flashSale.stock_allocated || 0) + item.quantity;
          await supabaseAdmin
            .from("flash_sales")
            .update({ stock_allocated: restoredStock })
            .eq("id", flashSale.id);
        }
      }

      await supabaseAdmin
        .from("payments")
        .update({ status: "expire" })
        .eq("order_id", order.id);

      cancelledIds.push(order.order_number);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Berhasil membatalkan ${cancelledIds.length} order expired.`,
        cancelledOrders: cancelledIds,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Cleanup expired orders error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Gagal cleanup order expired.",
      }),
      { status: 500 },
    );
  }
}
