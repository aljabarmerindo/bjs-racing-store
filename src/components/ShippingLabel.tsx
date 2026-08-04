// File: src/components/ShippingLabel.tsx
// Shipping label generator untuk print thermal printer 80mm + export PNG.
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { FiDownload, FiLoader } from "react-icons/fi";

interface ShippingLabelProps {
  barcodeDataUrl?: string;
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
  barcodeDataUrl = "",
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
  const [downloading, setDownloading] = useState(false);
  const weightText = `${(weight / 1000).toFixed(2)} Kg`;
  const isInternal = courierCode === "internal";
  const logoPath = COURIER_LOGOS[(courierCode || "").toLowerCase()] || "";

  const handleDownloadPng = async () => {
    if (!labelRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `resi-${waybillId || "order"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
      <div
        ref={labelRef}
        style={{
          width: "80mm",
          maxWidth: "80mm",
          height: "100mm",
          maxHeight: "100mm",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1pt solid #000",
          background: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#000",
          fontSize: "6.5pt",
          lineHeight: 1.15,
        }}
      >
        <table style={{ width: "100%", height: "56px", flexShrink: 0, borderBottom: BORDER_BOTTOM }}>
          <tr>
            <td style={{ width: "56px", height: "56px", padding: "5px 0 0 5px", textAlign: "left", verticalAlign: "top" }}>
              <div>
                {logoPath ? (
                  <img src={logoPath} alt={courierName} style={{ display: "block", height: "34px", objectFit: "contain" }} />
                ) : (
                  <div style={{ fontWeight: 900, fontSize: "10pt", lineHeight: 1 }}>
                    {courierName}
                    <div style={{ fontSize: "4pt", fontWeight: "bold", letterSpacing: "0.3px" }}>EXPRESS ACROSS NATIONS</div>
                  </div>
                )}
              </div>
            </td>
            <td style={{ verticalAlign: "middle", padding: "5px 0" }}>
              <div style={{ textAlign: "center", padding: "0 4px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <img
                    src="/icons/bjs-racing.png"
                    alt="BJS Racing Store"
                    style={{ height: "34px", objectFit: "contain" }}
                  />
                  <div style={{ fontSize: "24px", lineHeight: "34px", fontWeight: "bold", color: "#f97316" }}>BJS RACING</div>
                </div>
                <div style={{ fontSize: "5.5pt", color: "#444", fontWeight: "bold" }}>bjs-racing.com</div>
              </div>
            </td>
          </tr>
        </table>

        <div style={{ textAlign: "center", padding: "3px 2px 2px 2px", height: "56px", flexShrink: 0, overflow: "hidden", borderBottom: BORDER_BOTTOM }}>
          {isInternal ? (
            <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginTop: "4px" }}>Nomor Referensi - {referenceId}</div>
          ) : (
            <>
              {barcodeDataUrl ? (
                <img src={barcodeDataUrl} alt="Barcode" style={{ display: "block", margin: "0 auto", width: "100%", height: "38px", objectFit: "contain" }} />
              ) : null}
              <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginTop: "1px" }}>Nomor Resi - {waybillId}</div>
            </>
          )}
        </div>

        <div style={{ fontSize: "6.5pt", padding: "2px 4px", height: "14px", flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", borderBottom: BORDER_BOTTOM }}>
          Ongkos Kirim: Rp. {shippingCost.toLocaleString("id-ID")}
        </div>

        <div style={{ fontSize: "6.5pt", padding: "2px 4px", height: "14px", flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", borderBottom: BORDER_BOTTOM }}>
          Jenis Layanan - {serviceName}. Kode Rute - {routingCode}
        </div>

        <table style={{ width: "100%", fontSize: "6pt", height: "26px", flexShrink: 0, overflow: "hidden", borderBottom: BORDER_BOTTOM }}>
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

        <table style={{ width: "100%", flex: "1 1 0", minHeight: 0, overflow: "hidden", borderBottom: BORDER_BOTTOM }}>
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

        <div style={{ fontSize: "5.8pt", padding: "2px 4px", lineHeight: 1.15, height: "18px", flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", borderBottom: BORDER_BOTTOM }}>
          <strong>Jenis Barang:</strong> {items}
        </div>

        {notes ? (
          <div style={{ fontSize: "5.8pt", padding: "2px 4px", lineHeight: 1.15, height: "18px", flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", borderBottom: BORDER_BOTTOM }}>
            <strong>Catatan:</strong> {notes}
          </div>
        ) : null}

        <div style={{ textAlign: "center", fontSize: "5.2pt", color: "#222", padding: "2px 1px", lineHeight: 1.1, height: "20px", flexShrink: 0, overflow: "hidden" }}>
          Pengiriman melalui platform BJS RACING
          <br />
          <strong>bjs-racing.com</strong>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownloadPng}
        disabled={downloading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-bold rounded-lg shadow-sm hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        {downloading ? <FiLoader className="animate-spin" /> : <FiDownload />}
        {downloading ? "Mengunduh..." : "Download Resi"}
      </button>
    </div>
  );
}
