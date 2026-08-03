// File: src/lib/confirmOrderPayment.ts
// Logika konfirmasi pembayaran yang dipakai bersama oleh:
//  - webhook Midtrans (legacy)
//  - callback BRI QRIS
//  - endpoint konfirmasi manual admin
// Semua bagian idempoten (guard status RPC + UNIQUE invoice_number).
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { createBiteshipOrder } from "./biteship.ts";
import { sendOrderNotification } from "@/lib/notifications.ts";

export interface ConfirmResult {
  ok: boolean;
  error?: string;
}

const BITESHIP_CODES = new Set(["gojek", "pos", "jne", "jnt", "jntcargo"]);

const ORIGIN = {
  contactName: import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
  contactPhone: import.meta.env.BITESHIP_ORIGIN_PHONE || "",
  address: import.meta.env.BITESHIP_ORIGIN_ADDRESS || "",
  postalCode: import.meta.env.BITESHIP_ORIGIN_POSTAL || "",
  latitude: Number(import.meta.env.BITESHIP_ORIGIN_LAT || 0),
  longitude: Number(import.meta.env.BITESHIP_ORIGIN_LNG || 0),
};

async function bookBiteshipIfNeeded(orderData: any): Promise<void> {
  const cd = orderData.courier_details || {};
  const courierCompany = String(cd.courier_company || cd.code || "").toLowerCase();
  const courierServiceCode = cd.courier_service_code || "";

  if (!BITESHIP_CODES.has(courierCompany)) return;
  if (!courierServiceCode) return;
  if (cd.biteship_order_id) return;

  const addr = orderData.shipping_address;
  if (!addr) return;

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("nama_pelanggan, telepon")
    .eq("id", orderData.customer_id)
    .single();

  const items = (orderData.order_items || []).map((it: any) => ({
    name: it.products?.nama || "Item BJS",
    description: "Pesanan BJS Racing",
    quantity: it.quantity,
    weight: it.products?.berat_gram || 500,
    value: Number(it.price) || 0,
  }));

  try {
    const result = await createBiteshipOrder({
      referenceId: orderData.order_number,
      origin: ORIGIN,
      destination: {
        contactName: addr.recipient_name || customer?.nama_pelanggan || "",
        contactPhone: addr.recipient_phone || customer?.telepon || "",
        address: addr.full_address || "",
        postalCode: addr.postal_code || "",
        latitude: addr.latitude ? Number(addr.latitude) : undefined,
        longitude: addr.longitude ? Number(addr.longitude) : undefined,
      },
      courierCompany: courierCompany,
      courierType: courierServiceCode,
      items,
    });

    await supabaseAdmin
      .from("orders")
      .update({
        courier_details: {
          ...cd,
          biteship_order_id: result.id,
          waybill_id: result.waybillId,
          tracking_id: result.trackingId,
          routing_code: result.routingCode,
          shipping_status: result.status,
          courier_company: courierCompany,
          courier_service_code: courierServiceCode,
        },
      })
      .eq("id", orderData.id);
  } catch (err) {
    console.error(`[Biteship] Gagal booking untuk order ${orderData.order_number}:`, err);
  }
}

export async function confirmOrderPayment(
  orderNumber: string,
): Promise<ConfirmResult> {
  try {
    const { error: paymentError } = await supabaseAdmin.rpc(
      "handle_successful_payment",
      { p_order_number: orderNumber },
    );
    if (paymentError) {
      return {
        ok: false,
        error: `Gagal memproses pembayaran inti: ${paymentError.message}`,
      };
    }

    const { data: orderData, error: orderFetchError } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*, products(*))")
      .eq("order_number", orderNumber)
      .single();
    if (orderFetchError) throw orderFetchError;
    if (!orderData) throw new Error("Order tidak ditemukan.");

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("nama_pelanggan, telepon")
      .eq("id", orderData.customer_id)
      .single();

    if (orderData.id) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid" })
        .eq("order_id", orderData.id);
    }

    try {
      await sendOrderNotification({
        to: customer?.telepon || "",
        channel: "whatsapp",
        event: "payment_confirmed",
        data: {
          orderNumber: orderData.order_number,
          customerName: customer?.nama_pelanggan || "Customer",
          amount: orderData.total_amount,
          storeName: import.meta.env.STORE_NAME || "BJS Racing Store",
          storePhone: import.meta.env.STORE_PHONE || "+6288101169213",
        },
      });
    } catch (notifErr) {
      console.error("[Payment] Gagal kirim notifikasi payment_confirmed:", notifErr);
    }

    await bookBiteshipIfNeeded(orderData);

    const stockLogEntries = orderData.order_items.map((item: any) => {
      if (!item.products)
        throw new Error(
          `Produk dengan ID ${item.product_id} tidak ditemukan untuk item pesanan ${item.id}`,
        );
      return {
        product_id: item.product_id,
        perubahan: -item.quantity,
        keterangan: `Penjualan Online - Order #${orderData.order_number}`,
      };
    });

    let total_laba = 0;
    const transactionItemsJson = orderData.order_items.map((item: any) => {
      const laba_item =
        (item.price - item.products.harga_beli) * item.quantity;
      total_laba += laba_item;
      return {
        id: item.products.id,
        nama: item.products.nama,
        kode: item.products.kode,
        quantity: item.quantity,
        harga_jual: item.price,
        harga_beli: item.products.harga_beli,
      };
    });

    const transactionInsert = {
      customer_id: orderData.customer_id,
      total: orderData.total_amount,
      diskon: orderData.discount_amount || 0,
      total_akhir: orderData.total_amount,
      bayar: orderData.total_amount,
      kembalian: 0,
      items: transactionItemsJson,
      total_laba: total_laba,
      status_pembayaran: "Lunas",
      sisa_hutang: 0,
      invoice_number: orderData.order_number,
    };
    const { data: insertedTx, error: transactionError } = await (
      supabaseAdmin.from("transactions").insert(transactionInsert) as any
    )
      .onConflict("invoice_number")
      .ignore()
      .select();
    if (transactionError) throw transactionError;

    if (insertedTx && insertedTx.length > 0) {
      const { error: stockLogError } = await supabaseAdmin
        .from("stock_logs")
        .insert(stockLogEntries);
      if (stockLogError) throw stockLogError;
      console.log(
        `[LOGGING] Berhasil mencatat ${stockLogEntries.length} item ke stock_logs.`,
      );
    } else {
      const { data: existingLogs } = await supabaseAdmin
        .from("stock_logs")
        .select("product_id")
        .eq("keterangan", `Penjualan Online - Order #${orderData.order_number}`);

      const existingProductIds = new Set(
        (existingLogs || []).map((log: any) => log.product_id),
      );

      const newLogs = stockLogEntries.filter(
        (entry: any) => !existingProductIds.has(entry.product_id),
      );

      if (newLogs.length > 0) {
        const { error: stockLogError } = await supabaseAdmin
          .from("stock_logs")
          .insert(newLogs);
        if (stockLogError) throw stockLogError;
        console.log(
          `[LOGGING] Retry: mencatat ${newLogs.length} item baru ke stock_logs.`,
        );
      } else {
        console.log(
          `[LOGGING] Semua stock_logs untuk ${orderNumber} sudah tercatat.`,
        );
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan.",
    };
  }
}
