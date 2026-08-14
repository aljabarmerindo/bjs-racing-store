// File: src/pages/api/admin/orders/[id]/deliver.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const POST: APIRoute = async ({ params, locals }) => {
  const { session } = locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan." }), {
      status: 401,
    });
  }

  const orderId = params.id;
  if (!orderId) {
    return new Response(JSON.stringify({ message: "Order ID wajib diisi." }), {
      status: 400,
    });
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, courier_details, order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ message: "Pesanan tidak ditemukan." }), {
        status: 404,
      });
    }

    const courierCode = String(order.courier_details?.code || "").toLowerCase();
    if (courierCode !== "internal") {
      return new Response(
        JSON.stringify({ message: "Hanya pesanan BJS Express yang dapat dikonfirmasi melalui endpoint ini." }),
        { status: 400 },
      );
    }

    if (order.status === "completed") {
      return new Response(
        JSON.stringify({ message: "Pesanan ini sudah diselesaikan." }),
        { status: 400 },
      );
    }

    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    if (orderItems && orderItems.length > 0) {
      const saleLogs = orderItems.map((item: any) => ({
        product_id: item.product_id,
        perubahan: -item.quantity,
        keterangan: `Penjualan Dikonfirmasi - Order #${order.order_number}`,
        type: "sale",
      }));

      const { error: logError } = await supabaseAdmin
        .from("stock_logs")
        .insert(saleLogs);

      if (logError) throw logError;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Pesanan #${order.order_number} berhasil diselesaikan.`,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Confirm BJS Express delivery error:", error);
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Gagal mengkonfirmasi pengiriman.",
      }),
      { status: 500 },
    );
  }
};
