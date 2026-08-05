// File: src/pages/api/orders/[id]/invoice.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ locals, params }) => {
  const { session } = locals;
  const orderId = params?.id;

  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan." }), {
      status: 401,
    });
  }

  if (!orderId) {
    return new Response(JSON.stringify({ message: "Order ID wajib diisi." }), {
      status: 400,
    });
  }

  const escapeHtml = (str: string | number | null | undefined): string => {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  try {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, nama_pelanggan")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ message: "Profil customer tidak ditemukan." }), {
        status: 404,
      });
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (nama, kode)
        )
      `)
      .eq("id", orderId)
      .eq("customer_id", customer.id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ message: "Pesanan tidak ditemukan." }), {
        status: 404,
      });
    }

    const formatRupiah = (number: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(number || 0);

    const items = (order.order_items || [])
      .map((item: any) => {
        const name = escapeHtml(item.products?.nama || item.product_name || "Produk");
        return {
          name,
          qty: item.quantity,
          price: item.price || item.harga_satuan || 0,
          subtotal: (item.quantity || 0) * (item.price || item.harga_satuan || 0),
        };
      });

    const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const shippingCost = order.shipping_cost || 0;
    const discount = order.discount_amount || 0;
    const total = order.total_amount || subtotal + shippingCost - discount;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${escapeHtml(order.order_number)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #ea580c; }
          .info { text-align: right; }
          .section { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .text-right { text-align: right; }
          .total { font-size: 18px; font-weight: bold; color: #ea580c; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">BJS Racing Store</div>
            <p>Jl. Wijaya Kusuma No.79, Bangsri, Jepara</p>
            <p>HP: +62881011669213</p>
          </div>
          <div class="info">
            <h2>INVOICE</h2>
            <p><strong>No. Pesanan:</strong> ${escapeHtml(order.order_number)}</p>
            <p><strong>Tanggal:</strong> ${new Date(order.created_at).toLocaleDateString("id-ID")}</p>
            <p><strong>Status:</strong> ${order.status === "paid" ? "LUNAS" : escapeHtml(order.status)}</p>
          </div>
        </div>

        <div class="section">
          <h3>Pelanggan</h3>
          <p>${escapeHtml(order.shipping_address?.recipient_name || customer.nama_pelanggan)}</p>
          <p>${escapeHtml(order.shipping_address?.full_address || "")}</p>
          <p>${escapeHtml(order.shipping_address?.recipient_phone || "")}</p>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Harga</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-right">${item.qty}</td>
                  <td class="text-right">${formatRupiah(item.price)}</td>
                  <td class="text-right">${formatRupiah(item.subtotal)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <table>
            <tr>
              <td>Subtotal</td>
              <td class="text-right">${formatRupiah(subtotal)}</td>
            </tr>
            <tr>
              <td>Ongkos Kirim</td>
              <td class="text-right">${formatRupiah(shippingCost)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td>Diskon</td>
              <td class="text-right">- ${formatRupiah(discount)}</td>
            </tr>
            ` : ""}
            <tr>
              <td class="total">TOTAL</td>
              <td class="total text-right">${formatRupiah(total)}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h3>Pembayaran</h3>
          <p><strong>Metode:</strong> ${escapeHtml(order.payment_method || "Midtrans")}</p>
          <p><strong>Status:</strong> ${escapeHtml(order.payment_status || order.status)}</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Invoice error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal memuat invoice." }),
      { status: 500 },
    );
  }
};
