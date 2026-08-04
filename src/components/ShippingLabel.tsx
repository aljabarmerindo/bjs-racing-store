// File: src/components/ShippingLabel.tsx
// Shipping label generator untuk print thermal printer 80mm + export PNG.
import { useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import * as BWIPJS from "bwip-js";

interface ShippingLabelProps {
  courierCode?: string;
  courierName?: string;
  routingCode?: string;
  waybillId?: string;
  shippingCost?: number;
  serviceName?: string;
  referenceId?: string;
  quantity?: number;
  weight?: number;
  dimensions?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientPostal?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCity?: string;
  senderPostal?: string;
  items?: string;
  notes?: string;
  codAmount?: number;
  insuranceAmount?: number;
}

const COURIER_LOGOS: Record<string, string> = {
  gojek: "/icons/gojek.png",
  jne: "/icons/jne.png",
  jnt: "/icons/j&t.png",
  "j&t": "/icons/j&t.png",
  "j&t cargo": "/icons/j&tcargo.png",
  "jntcargo": "/icons/j&tcargo.png",
  pos: "/icons/pos-indonesia.png",
  internal: "/icons/bjs-express.png",
};

const BORDER_BOTTOM = "0.8pt solid #000";
const BORDER_RIGHT = "0.8pt solid #000";

export default function ShippingLabel({
  courierCode = "",
  courierName = "Biteship",
  routingCode = "-",
  waybillId = "-",
  shippingCost = 0,
  serviceName = "-",
  referenceId = "-",
  quantity = 1,
  weight = 0,
  dimensions = "10x10x10 cm",
  recipientName = "-",
  recipientPhone = "-",
  recipientAddress = "-",
  recipientCity = "-",
  recipientPostal = "-",
  senderName = "BJS RACING Official",
  senderPhone = "-",
  senderAddress = "-",
  senderCity = "Jepara, Jawa Tengah",
  senderPostal = "-",
  items = "-",
  notes = "",
  codAmount = 0,
  insuranceAmount = 0,
}: ShippingLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const weightText = `${(weight / 1000).toFixed(2)} Kg`;
  const isInternal = courierCode === "internal";
  const logoPath = COURIER_LOGOS[(courierCode || "").toLowerCase()] || "";

  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = barcodeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      BWIPJS.render(canvas, {
        bcid: "code128",
        text: String(waybillId || "-"),
        scale: 3,
        height: 30,
        includetext: false,
      });
    } catch (err) {
      console.error("[ShippingLabel] Gagal render barcode:", err);
    }
  }, [waybillId]);

  const handlePrint = () => {
    if (!labelRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const content = labelRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Shipping Label - ${waybillId}</title>
          <style>
            @page { size: 80mm 100mm; margin: 1.5mm; background: #fff; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 6.5pt; line-height: 1.15; }
            img { max-width: 100%; height: auto; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 3px; vertical-align: middle; }
            .border-bottom { border-bottom: 0.8pt solid #000; }
            .border-right { border-right: 0.8pt solid #000; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div style="width: 80mm; max-width: 80mm; border: 1pt solid #000; background: #fff; padding: 0; margin: 0;">
            ${content}
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPng = async () => {
    if (!labelRef.current) return;
    const dataUrl = await toPng(labelRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.download = `label-${waybillId || "order"}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
      <div
        ref={labelRef}
        style={{
          width: "80mm",
          maxWidth: "80mm",
          border: "1pt solid #000",
          background: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#000",
          fontSize: "6.5pt",
          lineHeight: 1.15,
        }}
      >
        <table style={{ height: "32px", borderBottom: BORDER_BOTTOM }}>
          <tr>
            <td style={{ width: "45%", borderRight: BORDER_RIGHT }}>
              <div style={{ textAlign: "center" }}>
                {logoPath ? (
                  <img src={logoPath} alt={courierName} style={{ height: "22px", objectFit: "contain" }} />
                ) : (
                  <div style={{ fontWeight: 900, fontSize: "10pt", lineHeight: 1 }}>
                    {courierName}
                    <div style={{ fontSize: "4pt", fontWeight: "bold", letterSpacing: "0.3px" }}>EXPRESS ACROSS NATIONS</div>
                  </div>
                )}
              </div>
            </td>
            <td style={{ width: "55%" }}>
              <div style={{ textAlign: "right", paddingRight: "4px" }}>
                <div style={{ fontSize: "8.5pt", fontWeight: 900, color: "#d32f2f", letterSpacing: "-0.2px", fontStyle: "italic" }}>🏁 BJS</div>
                <div style={{ fontSize: "5.5pt", fontWeight: "bold", color: "#111", marginTop: "-1px", display: "block" }}>BJS RACING</div>
                <div style={{ fontSize: "5pt", color: "#444", fontWeight: "bold" }}>bjs-racing.com</div>
              </div>
            </td>
          </tr>
        </table>

        <div style={{ textAlign: "center", padding: "3px 2px 2px 2px", borderBottom: BORDER_BOTTOM }}>
          {isInternal ? (
            <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginTop: "4px" }}>Nomor Referensi - {referenceId}</div>
          ) : (
            <>
              <canvas ref={barcodeCanvasRef} width="240" height="60" style={{ height: "36px", width: "auto" }} />
              <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginTop: "1px" }}>Nomor Resi - {waybillId}</div>
            </>
          )}
        </div>

        <div style={{ fontSize: "6.5pt", padding: "2px 4px", borderBottom: BORDER_BOTTOM }}>
          Ongkos Kirim: Rp. {shippingCost.toLocaleString("id-ID")}
        </div>

        <div style={{ fontSize: "6.5pt", padding: "2px 4px", borderBottom: BORDER_BOTTOM }}>
          Jenis Layanan - {serviceName}. Kode Rute - {routingCode}
        </div>

        <table style={{ fontSize: "6pt", borderBottom: BORDER_BOTTOM }}>
          <tr>
            <td style={{ width: "50%", borderRight: BORDER_RIGHT }}>
              <strong>Reference Number</strong>
              <br />
              {referenceId}
            </td>
            <td style={{ width: "50%" }}>
              Quantity: <strong>{quantity} Pcs</strong>
              <br />
              Weight: <strong>{weightText}</strong>
              <br />
              Dimensi: <strong>{dimensions}</strong>
            </td>
          </tr>
        </table>

        <table style={{ borderBottom: BORDER_BOTTOM }}>
          <tr>
            <td style={{ width: "50%", verticalAlign: "top", padding: "3px", borderRight: BORDER_RIGHT }}>
              <div style={{ fontWeight: "bold", fontSize: "6pt", marginBottom: "1px" }}>Alamat Penerima:</div>
              <div style={{ fontWeight: "bold", fontSize: "6.5pt" }}>{recipientName}</div>
              <div>{recipientPhone}</div>
              <div>
                {recipientAddress}, {recipientCity}, {recipientPostal}
              </div>
              {insuranceAmount > 0 && (
                <div style={{ marginTop: "2px" }}>
                  <strong>Asuransi: Rp. {insuranceAmount.toLocaleString("id-ID")}</strong>
                </div>
              )}
            </td>
            <td style={{ width: "50%", verticalAlign: "top", padding: "3px" }}>
              <div style={{ fontWeight: "bold", fontSize: "6pt", marginBottom: "1px" }}>Alamat Pengirim:</div>
              <div style={{ fontWeight: "bold", fontSize: "6.5pt" }}>{senderName}</div>
              <div>{senderPhone}</div>
              <div>
                {senderAddress}, {senderCity}, {senderPostal}
              </div>
            </td>
          </tr>
        </table>

        <div style={{ fontSize: "5.8pt", padding: "2px 4px", lineHeight: 1.15, borderBottom: BORDER_BOTTOM }}>
          <strong>Jenis Barang:</strong> {items}
        </div>

        {notes ? (
          <div style={{ fontSize: "5.8pt", padding: "2px 4px", lineHeight: 1.15, borderBottom: BORDER_BOTTOM }}>
            <strong>Catatan:</strong> {notes}
          </div>
        ) : null}

        <div style={{ textAlign: "center", fontSize: "5.2pt", color: "#222", padding: "2px 1px", lineHeight: 1.1 }}>
          Pengiriman melalui platform BJS RACING
          <br />
          <strong>bjs-racing.com</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handlePrint}
          style={{ padding: "6px 12px", fontSize: "10pt", fontWeight: "bold", cursor: "pointer" }}
        >
          Print Label
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          style={{ padding: "6px 12px", fontSize: "10pt", fontWeight: "bold", cursor: "pointer" }}
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
