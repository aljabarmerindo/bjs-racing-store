// File: src/pages/api/shipping/biteship/label.ts
// Generate shipping label HTML untuk print thermal printer 80mm.
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import bwipjs from "bwip-js";

export const GET: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }

  const waybillId = context.url.searchParams.get("waybillId");
  const orderId = context.url.searchParams.get("orderId");

  if (!waybillId && !orderId) {
    return new Response(
      JSON.stringify({ message: "waybillId atau orderId wajib diisi." }),
      { status: 400 },
    );
  }

  try {
    let order = null;
    let shipping = null;

    if (orderId) {
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*, shipping_address, courier_details")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        return new Response(
          JSON.stringify({ message: "Order tidak ditemukan." }),
          { status: 404 },
        );
      }
      order = orderData;
      shipping = order.courier_details || {};
    }

    const isInternal = shipping?.code === "internal";
    const labelData = {
      courierName: shipping?.courier_company || shipping?.code || "Biteship",
      isInternal,
      routingCode: shipping?.routing_code || "-",
      waybillId: waybillId || shipping?.waybill_id || shipping?.tracking_id || "-",
      shippingCost: order?.shipping_cost || 0,
      serviceName: shipping?.service || shipping?.courier_service_name || "-",
      referenceId: order?.order_number || "-",
      quantity: order?.order_items?.length || 1,
      weight: order?.order_items?.reduce?.((sum: number, item: any) => sum + ((item.products?.berat_gram || 500) * (item.quantity || 1)), 0) || 0,
      dimensions: "10x10x10 cm",
      recipientName: order?.shipping_address?.recipient_name || "-",
      recipientPhone: order?.shipping_address?.recipient_phone || "-",
      recipientAddress: order?.shipping_address?.full_address || "-",
      recipientCity: order?.shipping_address?.destination_text || "-",
      recipientPostal: order?.shipping_address?.postal_code || "-",
      senderName: import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
      senderPhone: import.meta.env.BITESHIP_ORIGIN_PHONE || "-",
      senderAddress: import.meta.env.BITESHIP_ORIGIN_ADDRESS || "-",
      senderCity: "Jepara, Jawa Tengah",
      senderPostal: import.meta.env.BITESHIP_ORIGIN_POSTAL || "-",
      items: (order?.order_items || [])
        .map((item: any) => `${item.quantity}x ${item.products?.nama || "Item"}`)
        .join(", ") || "-",
      notes: order?.notes || "",
      codAmount: order?.payment_method === "cod" ? order?.total_amount : 0,
      insuranceAmount: 0,
    };

    let barcodeImg = "";
    if (!isInternal && labelData.waybillId && labelData.waybillId !== "-") {
      try {
        const barcodePng: Buffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: String(labelData.waybillId),
          scale: 3,
          height: 8,
          includetext: false,
        });
        barcodeImg = `data:image/png;base64,${barcodePng.toString("base64")}`;
      } catch (err) {
        console.error("Gagal generate barcode label:", err);
      }
    }

    const html = `<!DOCTYPE html><html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${labelData.waybillId}</title>
  <style>
    @page {
      size: 80mm 100mm;
      margin: 1.5mm;
      background-color: #ffffff;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      color: #000000;
      font-size: 6.5pt;
      line-height: 1.15;
      background-color: #ffffff;
    }
    .label-container {
      width: 80mm;
      max-width: 80mm;
      border: 1pt solid #000000;
      background: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 2px 3px;
      vertical-align: middle;
    }
    .border-bottom {
      border-bottom: 0.8pt solid #000000;
    }
    .border-right {
      border-right: 0.8pt solid #000000;
    }
    .logo-courier {
      font-weight: 900;
      font-size: 10pt;
      text-align: center;
      line-height: 1;
    }
    .logo-courier-sub {
      font-size: 4pt;
      font-weight: bold;
      display: block;
      letter-spacing: 0.3px;
    }
    .logo-bjs {
      text-align: center;
      padding: 2px 4px;
    }
    .bjs-brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .bjs-logo-img {
      height: 16px;
      object-fit: contain;
    }
    .bjs-sub {
      font-size: 5.5pt;
      font-weight: bold;
      color: #f97316;
    }
    .bjs-url {
      font-size: 5pt;
      color: #444;
      font-weight: bold;
    }
    .barcode-section {
      text-align: center;
      padding: 3px 2px 2px 2px;
    }
    .resi-text {
      font-size: 7.5pt;
      font-weight: bold;
      margin-top: 1px;
    }
    .info-text {
      font-size: 6.5pt;
      padding: 2px 4px;
    }
    .ref-table td {
      padding: 2px 3px;
      font-size: 6pt;
    }
    .address-header {
      font-weight: bold;
      font-size: 6pt;
      margin-bottom: 1px;
    }
    .address-box {
      vertical-align: top;
      padding: 3px;
      font-size: 5.8pt;
      line-height: 1.15;
    }
    .address-name {
      font-weight: bold;
      font-size: 6.5pt;
    }
    .item-box {
      font-size: 5.8pt;
      padding: 2px 4px;
      line-height: 1.15;
    }
    .footer {
      text-align: center;
      font-size: 5.2pt;
      color: #222222;
      padding: 2px 1px;
      line-height: 1.1;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="label-container">
    <table style="height: 32px;" class="border-bottom">
      <tr>
        <td style="width: 45%; padding: 3px;" class="border-right">
          <div style="text-align: center;">
            <div class="logo-courier">
              ${labelData.courierName}
              <span class="logo-courier-sub">EXPRESS ACROSS NATIONS</span>
            </div>
          </div>
        </td>
        <td style="width: 55%;" class="logo-bjs">
          <div class="bjs-brand-row">
            <img src="/icons/bjs-racing.png" alt="BJS Racing Store" class="bjs-logo-img" />
            <div class="bjs-sub">BJS RACING</div>
          </div>
          <div class="bjs-url">bjs-racing.com</div>
        </td>
      </tr>
    </table>

    <div class="barcode-section border-bottom">
      ${labelData.isInternal
        ? `<div class="resi-text">Nomor Referensi - ${labelData.referenceId}</div>`
        : `${barcodeImg ? `<img src="${barcodeImg}" alt="Barcode" style="display: block; margin: 0 auto; width: 100%; max-width: 100%; height: auto;" />` : ""}<div class="resi-text">Nomor Resi - ${labelData.waybillId}</div>`}
    </div>

    <div class="info-text border-bottom">
      Ongkos Kirim: Rp. ${labelData.shippingCost.toLocaleString("id-ID")}
    </div>

    <div class="info-text border-bottom">
      Jenis Layanan - ${labelData.serviceName}. Kode Rute - ${labelData.routingCode}
    </div>

    <table class="ref-table border-bottom">
      <tr>
        <td style="width: 50%;" class="border-right">
          <strong>Reference Number</strong><br />
          ${labelData.referenceId}
        </td>
        <td style="width: 50%;">
          Quantity: <strong>${labelData.quantity} Pcs</strong><br />
          Weight: <strong>${(labelData.weight / 1000).toFixed(2)} Kg</strong><br />
          Dimensi: <strong>${labelData.dimensions}</strong>
        </td>
      </tr>
    </table>

    <table class="border-bottom">
      <tr>
        <td style="width: 50%;" class="border-right address-box">
          <div class="address-header">Alamat Penerima:</div>
          <div class="address-name">${labelData.recipientName}</div>
          <div>${labelData.recipientPhone}</div>
          <div>${labelData.recipientAddress}, ${labelData.recipientCity}, ${labelData.recipientPostal}</div>
          ${labelData.insuranceAmount > 0 ? `<div style="margin-top: 2px;"><strong>Asuransi: Rp. ${labelData.insuranceAmount.toLocaleString("id-ID")}</strong></div>` : ""}
        </td>
        <td style="width: 50%;" class="address-box">
          <div class="address-header">Alamat Pengirim:</div>
          <div class="address-name">${labelData.senderName}</div>
          <div>${labelData.senderPhone}</div>
          <div>${labelData.senderAddress}, ${labelData.senderCity}, ${labelData.senderPostal}</div>
        </td>
      </tr>
    </table>

    <div class="item-box border-bottom">
      <strong>Jenis Barang:</strong> ${labelData.items}
    </div>

    ${labelData.notes ? `<div class="item-box border-bottom"><strong>Catatan:</strong> ${labelData.notes}</div>` : ""}

    <div class="footer">
      Pengiriman melalui platform BJS RACING<br />
      <strong>bjs-racing.com</strong>
    </div>

    <div class="no-print" style="text-align: center; padding: 8px 4px 10px 4px;">
      <button onclick="window.print()" style="padding: 6px 12px; font-size: 10pt; font-weight: bold; cursor: pointer;">
        Print Label
      </button>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="label-${labelData.waybillId}.html"`,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Gagal generate label.",
      }),
      { status: 500 },
    );
  }
};

