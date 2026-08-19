// File: src/pages/api/payment/bri/callback.ts
import type { APIRoute } from "astro";
import { verifyBriSignature } from "@/lib/bri.ts";
import { confirmOrderPayment } from "@/lib/confirmOrderPayment.ts";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("X-Timestamp") || "";
    const signature =
      request.headers.get("X-Signature") ||
      request.headers.get("BRI-Signature") ||
      "";
    const path = url.pathname;

    const valid = verifyBriSignature({
      method: "POST",
      path,
      timestamp,
      rawBody,
      signature,
    });
    if (!valid) {
      console.error("[BRI] Signature callback tidak valid");
      return new Response("Invalid signature", { status: 200 });
    }

    const body = JSON.parse(rawBody);
    const orderNumber =
      body.partnerReferenceNo || body.referenceNo || body.orderId;
    const status = body.status ?? body.responseCode ?? "";
    // Removed Midtrans-specific "settlement" status from BRI callback
    const isPaid =
      status === "SUCCESS" ||
      status === "2002700" ||
      body.responseMessage === "Success";

    if (!orderNumber) return new Response("OK", { status: 200 });

    if (isPaid) {
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id, status, order_number")
        .eq("order_number", orderNumber)
        .single();

      if (orderError || !orderData) {
        console.error(`[BRI] Order ${orderNumber} tidak ditemukan:`, orderError);
        return new Response("OK", { status: 200 });
      }

      if (orderData.status !== "awaiting_payment") {
        console.log(`[BRI] Order ${orderNumber} sudah diproses (status: ${orderData.status}), skip.`);
        return new Response("OK", { status: 200 });
      }

      const result = await confirmOrderPayment(orderNumber);
      if (!result.ok) {
        console.error("[BRI] Gagal konfirmasi pembayaran:", result.error);
      } else {
        console.log(`[BRI] Pembayaran order ${orderNumber} dikonfirmasi.`);
      }
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[BRI] Error callback:", error);
    return new Response("OK", { status: 200 });
  }
};
