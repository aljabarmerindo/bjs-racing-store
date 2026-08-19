// File: /src/pages/api/payment/webhook.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import crypto from "crypto";
import { confirmOrderPayment } from "@/lib/confirmOrderPayment.ts";
import { cancelBiteshipOrder } from "@/lib/biteship.ts";

export const POST: APIRoute = async ({ request }) => {
    try {
        const midtransNotification = await request.json();
        const serverKey = import.meta.env.MIDTRANS_SERVER_KEY;

        const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } =
            midtransNotification;

        if (!order_id || !signature_key || !serverKey) {
            console.error("Webhook missing required fields:", { order_id: !!order_id, signature_key: !!signature_key, serverKey: !!serverKey });
            return new Response("Invalid payload.", { status: 200 });
        }

        const hashSource = `${order_id}${status_code ?? ""}${gross_amount ?? ""}${serverKey}`;
        const hash = crypto
            .createHash("sha512")
            .update(hashSource)
            .digest("hex");

        if (hash !== signature_key) {
            console.error("Invalid Midtrans signature key received.", { order_id, status_code, gross_amount });
            return new Response("Invalid signature.", { status: 200 });
        }

        const isSettlement =
          transaction_status === "settlement" &&
          (!fraud_status || fraud_status === "accept");

        const isChallenge =
          transaction_status === "settlement" &&
          fraud_status === "challenge";

        if (isSettlement) {
            const result = await confirmOrderPayment(order_id);
            if (!result.ok) {
                console.error(
                    `KRITIS: Gagal memproses pembayaran inti untuk Order ID: ${order_id}. Error:`,
                    result.error,
                );
                return new Response(
                    "Critical payment processing failed but acknowledged.",
                    { status: 200 },
                );
            }
        } else if (isChallenge) {
            const { data: orderData } = await supabaseAdmin
                .from("orders")
                .select("id")
                .eq("order_number", order_id)
                .single();
            if (orderData) {
                await supabaseAdmin
                    .from("payments")
                    .update({ status: "challenge" })
                    .eq("order_id", orderData.id);
                console.warn(`[Midtrans] Order ${order_id} under fraud challenge.`);
            }
        } else if (["cancel", "expire", "deny"].includes(transaction_status)) {
            const { data: orderData } = await supabaseAdmin
                .from("orders")
                .update({ status: "cancelled" })
                .eq("order_number", order_id)
                .select("id, courier_details")
                .single();
            if (orderData) {
                await supabaseAdmin
                    .from("payments")
                    .update({ status: transaction_status })
                    .eq("order_id", orderData.id);

                const { data: orderItems } = await supabaseAdmin
                    .from("order_items")
                    .select("product_id, quantity")
                    .eq("order_id", orderData.id);
                if (orderItems && orderItems.length > 0) {
                    const productIds = orderItems.map(
                        (item) => item.product_id,
                    );
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

                const cd = orderData.courier_details || {};
                const biteshipOrderId = cd.biteship_order_id;
                if (biteshipOrderId) {
                    try {
                        await cancelBiteshipOrder(biteshipOrderId);
                        await supabaseAdmin
                            .from("orders")
                            .update({
                                courier_details: {
                                    ...cd,
                                    biteship_order_id: null,
                                    shipping_status: "cancelled",
                                },
                            })
                            .eq("id", orderData.id);
                    } catch (cancelErr) {
                        console.error(`[Biteship] Gagal cancel order ${biteshipOrderId}:`, cancelErr);
                    }
                }
            }
        }

        return new Response("Notification successfully processed.", {
            status: 200,
        });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return new Response(
            "Error processing notification, but acknowledged.",
            { status: 200 },
        );
    }
};
