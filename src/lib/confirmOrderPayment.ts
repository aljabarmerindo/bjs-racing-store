// File: src/lib/confirmOrderPayment.ts
// Logika konfirmasi pembayaran yang dipakai bersama oleh:
//  - webhook Midtrans (legacy)
//  - callback BRI QRIS
//  - endpoint konfirmasi manual admin
// Semua bagian idempoten (guard status RPC + UNIQUE invoice_number).
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export interface ConfirmResult {
  ok: boolean;
  error?: string;
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

    if (orderData.id) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid" })
        .eq("order_id", orderData.id);
    }

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
