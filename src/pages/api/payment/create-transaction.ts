// File: /src/pages/api/payment/create-transaction.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { getPaymentFee, toMidtransPaymentCode } from "@/lib/paymentFee";
import { validateAndComputeVoucher, consumeVoucher } from "@/lib/voucher.ts";
import { generateBriQrMpm, BRI_CONFIG } from "@/lib/bri.ts";
import { sendOrderNotification } from "@/lib/notifications.ts";
import { Buffer } from "buffer";

interface FrontendCartItem {
    product_id: string;
    price: number;
    quantity: number;
    name: string;
    sku: string;
    image_url: string;
}

function generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `BJS-${year}${month}${day}-${randomPart}`;
}

async function computeServerDiscount({
  voucher_code,
  customer_id,
  cart_subtotal,
  shipping_cost,
  cartProductIds,
}: {
  voucher_code: string | null;
  customer_id: string;
  cart_subtotal: number;
  shipping_cost: number;
  cartProductIds: string[];
}) {
  if (!voucher_code) return { discount_amount: 0, voucherId: null };
  const result = await validateAndComputeVoucher(
    voucher_code,
    customer_id,
    cart_subtotal,
    shipping_cost,
    cartProductIds,
  );
  if (!result.valid) throw new Error(result.message || "Voucher tidak valid.");
  return { discount_amount: result.discount_amount || 0, voucherId: result.voucher?.id ?? null };
}

export const POST: APIRoute = async ({ request, locals }) => {
    const { session } = locals;
    if (!session) {
        return new Response(
            JSON.stringify({ message: "Otentikasi diperlukan." }),
            { status: 401 },
        );
    }

    try {
        const body = await request.json();
        const {
            address_id,
            courier,
            cart_items,
            shipping_cost,
            payment_method,
            voucher_code,
        } = body;
        const typedCartItems = cart_items as FrontendCartItem[];

        if (
            !address_id ||
            !courier ||
            !typedCartItems ||
            typedCartItems.length === 0
        ) {
            return new Response(
                JSON.stringify({ message: "Data checkout tidak lengkap." }),
                { status: 400 },
            );
        }

        if (!payment_method) {
            return new Response(
                JSON.stringify({ message: "Metode pembayaran harus dipilih." }),
                { status: 400 },
            );
        }

        // Blok validasi stok (tidak berubah)
        const productIds = typedCartItems.map((item) => item.product_id);
        const { data: productsInStock, error: stockCheckError } =
            await supabaseAdmin
                .from("products")
                .select("id, nama, stok")
                .in("id", productIds);
        if (stockCheckError)
            throw new Error("Gagal memverifikasi stok produk.");
        for (const item of typedCartItems) {
            const product = productsInStock.find(
                (p) => p.id === item.product_id,
            );
            if (!product || item.quantity > product.stok) {
                return new Response(
                    JSON.stringify({
                        message: `Stok untuk produk "${item.name}" tidak mencukupi. Sisa stok: ${product?.stok || 0}. Silakan perbarui keranjang Anda.`,
                    }),
                    { status: 409 },
                );
            }
        }

        // Blok validasi stok flash sale
        const { data: flashSalesInStock, error: flashSaleStockError } =
            await supabaseAdmin
                .from("flash_sales")
                .select("id, product_id, stock_allocated")
                .in("product_id", productIds)
                .eq("is_active", true);
        if (flashSaleStockError)
            throw new Error("Gagal memverifikasi stok flash sale.");
        for (const item of typedCartItems) {
            const flashSale = flashSalesInStock.find(
                (fs) => fs.product_id === item.product_id,
            );
            if (flashSale && item.quantity > flashSale.stock_allocated) {
                return new Response(
                    JSON.stringify({
                        message: `Stok flash sale untuk produk "${item.name}" tidak mencukupi. Sisa: ${flashSale.stock_allocated}.`,
                    }),
                    { status: 409 },
                );
            }
        }

        const { data: customer, error: customerError } = await supabaseAdmin
            .from("customers")
            .select("id, nama_pelanggan, telepon")
            .eq("auth_user_id", session.user.id)
            .single();
        if (customerError) throw new Error("Profil pelanggan tidak ditemukan.");

        const { data: address, error: addressError } = await supabaseAdmin
            .from("customer_addresses")
            .select("*")
            .eq("id", address_id)
            .eq("customer_id", customer.id)
            .single();
        if (addressError) throw new Error("Alamat pengiriman tidak valid.");

        const subtotalProducts = typedCartItems.reduce(
            (acc: number, item: FrontendCartItem) =>
                acc + item.price * item.quantity,
            0,
        );
        const finalShippingCost = Number(shipping_cost) || 0;
        const paymentMethod = String(payment_method || "").toLowerCase();
        const feeBase = subtotalProducts + finalShippingCost;
        const finalPaymentGatewayFee = getPaymentFee(
            paymentMethod,
            feeBase,
        );

        const { discount_amount: finalDiscountAmount, voucherId: appliedVoucherId } =
            await computeServerDiscount({
                voucher_code,
                customer_id: customer.id,
                cart_subtotal: subtotalProducts,
                shipping_cost: finalShippingCost,
                cartProductIds: typedCartItems.map((item) => item.product_id),
            });

        const totalAmount =
            subtotalProducts +
            finalShippingCost +
            finalPaymentGatewayFee -
            (finalDiscountAmount || 0);

        const orderNumber = generateOrderNumber();
        const { data: newOrder, error: orderError } = await supabaseAdmin
            .from("orders")
            .insert({
                order_number: orderNumber,
                customer_id: customer.id,
                total_amount: totalAmount,
                shipping_cost: finalShippingCost,
                subtotal_products: subtotalProducts,
                service_fee: 0,
                payment_gateway_fee: finalPaymentGatewayFee,
                voucher_code: voucher_code, // <-- Simpan kode voucher
                discount_amount: finalDiscountAmount, // <-- Simpan jumlah diskon
                shipping_address: address,
                courier_details: courier,
                status: "awaiting_payment",
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Tandai voucher sudah dipakai & naikkan usage_count agar tidak bisa dipakai ulang.
        // Dilakukan setelah order berhasil dibuat.
        if (appliedVoucherId) {
            await consumeVoucher(customer.id, appliedVoucherId);
        }

        const orderItemsData = typedCartItems.map((item: FrontendCartItem) => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            product_snapshot: {
                name: item.name,
                sku: item.sku,
                image_url: item.image_url,
            },
        }));

        const { error: orderItemsError } = await supabaseAdmin
            .from("order_items")
            .insert(orderItemsData);
        if (orderItemsError) throw orderItemsError;

        const flashSaleProductIds = typedCartItems.map((item) => item.product_id);
        const { data: activeFlashSales, error: flashSalesError } =
          await supabaseAdmin
            .from("flash_sales")
            .select("id, product_id, stock_allocated")
            .in("product_id", flashSaleProductIds)
            .eq("is_active", true);
        if (flashSalesError) throw flashSalesError;

        for (const item of typedCartItems) {
          const flashSale = activeFlashSales.find(
            (fs) => fs.product_id === item.product_id,
          );
          if (!flashSale) continue;
          const newStock = Math.max(0, (flashSale.stock_allocated || 0) - item.quantity);
          const { error: decrementError } = await supabaseAdmin
            .from("flash_sales")
            .update({ stock_allocated: newStock })
            .eq("id", flashSale.id);
          if (decrementError) throw decrementError;
        }

        const paymentGateway = (
            import.meta.env.PAYMENT_GATEWAY || "midtrans"
        ).toLowerCase();

        if (paymentGateway === "bri") {
            const qr = await generateBriQrMpm({
                partnerReferenceNo: orderNumber,
                amount: totalAmount,
                callbackUrl: BRI_CONFIG.callbackUrl,
            });
            await supabaseAdmin.from("payments").insert({
                order_id: newOrder.id,
                gateway: "bri",
                payment_reference: qr.qrContent,
                amount: totalAmount,
                status: "pending",
            });
            return new Response(
                JSON.stringify({
                    qr_content: qr.qrContent,
                    qr_image_base64: qr.qrImage,
                    expires_at: qr.expiresAt,
                    order_id: newOrder.id,
                }),
                { status: 200 },
            );
        }

        const formatAmount = (amount: number) => Math.round(amount * 100) / 100;
        const truncateName = (name: string) => name.substring(0, 50);

        const midtransServerKey = import.meta.env.MIDTRANS_SERVER_KEY;
        const authString = Buffer.from(`${midtransServerKey}:`).toString(
            "base64",
        );

        const item_details = typedCartItems.map((item: FrontendCartItem) => ({
            id: item.product_id,
            price: formatAmount(item.price),
            quantity: item.quantity,
            name: truncateName(item.name),
        }));
        if (finalShippingCost > 0) {
            item_details.push({
                id: "SHIPPING",
                price: formatAmount(finalShippingCost),
                quantity: 1,
                name: truncateName(`Ongkir (${courier.name} - ${courier.service})`),
            });
        }
        if (finalPaymentGatewayFee > 0) {
            item_details.push({
                id: "PAYMENT_GATEWAY_FEE",
                price: formatAmount(finalPaymentGatewayFee),
                quantity: 1,
                name: truncateName("Biaya Transaksi"),
            });
        }

        if (finalDiscountAmount > 0) {
            item_details.push({
                id: `DISCOUNT_${voucher_code}`,
                price: formatAmount(-finalDiscountAmount),
                quantity: 1,
                name: truncateName(`Diskon (${voucher_code})`),
            });
        }

        const enabled_payments = finalPaymentGatewayFee > 0 ? [toMidtransPaymentCode(paymentMethod as any)] : [];

        const calculatedTotal = item_details.reduce(
            (sum, item) => sum + formatAmount(item.price) * item.quantity,
            0,
        );
        const grossAmount = formatAmount(calculatedTotal);

        const midtransPayload = {
            transaction_details: {
                order_id: orderNumber,
                gross_amount: grossAmount,
            },
            item_details: item_details.map((item) => ({
                ...item,
                price: formatAmount(item.price),
                name: truncateName(item.name),
            })),
            enabled_payments: enabled_payments,
            customer_details: {
                first_name: customer.nama_pelanggan,
                phone: customer.telepon,
                email: session.user.email,
                shipping_address: {
                    first_name: address.recipient_name,
                    phone: address.recipient_phone,
                    address: address.full_address,
                    city: address.destination_text.split(",")[0],
                    postal_code: address.postal_code,
                    country_code: "IDN",
                },
            },
        };

        const midtransResponse = await fetch(
            "https://app.sandbox.midtrans.com/snap/v1/transactions",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Basic ${authString}`,
                },
                body: JSON.stringify(midtransPayload),
            },
        );

        const midtransResult = await midtransResponse.json();
        if (!midtransResponse.ok) {
            throw new Error(
                `Midtrans Error: ${JSON.stringify(midtransResult)}`,
            );
        }

        await supabaseAdmin
            .from("payments")
            .insert({
                order_id: newOrder.id,
                midtrans_transaction_id: midtransResult.token,
                amount: totalAmount,
                status: "pending",
            });

        void sendOrderNotification({
          to: customer.telepon,
          channel: "whatsapp",
          event: "order_created",
          data: {
            orderNumber: newOrder.order_number,
            customerName: customer.nama_pelanggan,
            amount: totalAmount,
            storeName: "BJS Racing Store",
            storePhone: "+6288101169213",
          },
        }).catch((err: unknown) => console.error("Gagal kirim notifikasi order_created:", err));

        const pointsToAdd = Math.floor(totalAmount / 100);
        if (pointsToAdd > 0) {
          try {
            await supabaseAdmin
              .from("loyalty_points")
              .insert({
                customer_id: customer.id,
                order_id: newOrder.id,
                points: pointsToAdd,
                type: "earned",
                description: `Poin dari pesanan ${newOrder.order_number}`,
              });
          } catch (err) {
            console.error("Gagal menambah loyalty points:", err);
          }
        }

        return new Response(
            JSON.stringify({
                snap_token: midtransResult.token,
                order_id: newOrder.id,
            }),
            { status: 200 },
        );
    } catch (error) {
        let errorMessage = "Terjadi kesalahan pada server.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error("Create Transaction API Error:", error);
        return new Response(JSON.stringify({ message: errorMessage }), {
            status: 500,
        });
    }
};
