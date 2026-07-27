// File: src/components/ShippingLabel.tsx
// Shipping label generator untuk print thermal printer 80mm.
// Format mengikuti sample Biteship shipping label.

interface ShippingLabelProps {
  courierName?: string;
  courierLogo?: string;
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

export default function ShippingLabel({
  courierName = "JNE",
  courierLogo = "",
  routingCode = "-",
  waybillId = "-",
  shippingCost = 0,
  serviceName = "Reguler",
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
  senderCity = "-",
  senderPostal = "-",
  items = "-",
  notes = "",
  codAmount = 0,
  insuranceAmount = 0,
}: ShippingLabelProps) {
  const weightText = weight >= 1000 ? `${(weight / 1000).toFixed(2)} Kg` : `${weight} gram`;
  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

  return (
    <div className="label-container">
      <style>
        {`
          @page {
            size: 80mm 100mm;
            margin: 1.5mm;
            background-color: #ffffff;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          .label-container {
            width: 80mm;
            max-width: 80mm;
            border: 1pt solid #000000;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            color: #000000;
            font-size: 6.5pt;
            line-height: 1.15;
            padding: 0;
            margin: 0;
          }
          .label-container table {
            width: 100%;
            border-collapse: collapse;
          }
          .label-container td {
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
            text-align: right;
            padding-right: 4px;
          }
          .bjs-title {
            font-size: 8.5pt;
            font-weight: 900;
            color: #d32f2f;
            letter-spacing: -0.2px;
            font-style: italic;
          }
          .bjs-sub {
            font-size: 5.5pt;
            font-weight: bold;
            color: #111111;
            display: block;
            margin-top: -1px;
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
        `}
      </style>

        {/* Header: Logo Ekspedisi & Logo BJS RACING */}
        <table style={{ height: "32px" }} className="border-bottom">
          <tr>
            <td style={{ width: "45%" }} className="border-right">
              <div style={{ textAlign: "center" }}>
                <div className="logo-courier">
                  {courierName}
                  <span className="logo-courier-sub">EXPRESS ACROSS NATIONS</span>
                </div>
              </div>
            </td>
            <td style={{ width: "55%" }} className="logo-bjs">
              <div className="bjs-title">🏁 BJS</div>
              <div className="bjs-sub">BJS RACING</div>
              <div className="bjs-url">bjs-racing.com</div>
            </td>
          </tr>
        </table>

        {/* Barcode & Resi */}
        <div className="barcode-section border-bottom">
          <div className="resi-text">Nomor Resi - {waybillId}</div>
        </div>

        {/* Ongkos Kirim */}
        <div className="info-text border-bottom">
          Ongkos Kirim: {formatRupiah(shippingCost)}
        </div>

        {/* Jenis Layanan & Kode Rute */}
        <div className="info-text border-bottom">
          Jenis Layanan - {serviceName}. Kode Rute - {routingCode}
        </div>

        {/* Reference Number, Quantity, Weight */}
        <table className="ref-table border-bottom">
          <tr>
            <td style={{ width: "50%" }} className="border-right">
              <strong>Reference Number</strong>
              <br />
              {referenceId}
            </td>
            <td style={{ width: "50%" }}>
              Quantity: <strong>{quantity} Pcs</strong>
              <br />
              Weight: <strong>{weightText}</strong>
            </td>
          </tr>
        </table>

        {/* Address Section */}
        <table className="border-bottom">
          <tr>
            <td style={{ width: "50%" }} className="border-right address-box">
              <div className="address-header">Alamat Penerima:</div>
              <div className="address-name">{recipientName}</div>
              <div>{recipientPhone}</div>
              <div>
                {recipientAddress}, {recipientCity}, {recipientPostal}
              </div>
              {insuranceAmount > 0 && (
                <div style={{ marginTop: "2px" }}>
                  <strong>Asuransi: {formatRupiah(insuranceAmount)}</strong>
                </div>
              )}
            </td>
            <td style={{ width: "50%" }} className="address-box">
              <div className="address-header">Alamat Pengirim:</div>
              <div className="address-name">{senderName}</div>
              <div>{senderPhone}</div>
              <div>
                {senderAddress}, {senderCity}, {senderPostal}
              </div>
            </td>
          </tr>
        </table>

        {/* Jenis Barang */}
        <div className="item-box border-bottom">
          <strong>Jenis Barang:</strong> {items}
        </div>

        {/* Catatan */}
        {notes && (
          <div className="item-box border-bottom">
            <strong>Catatan:</strong> {notes}
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          Pengiriman melalui platform BJS RACING
          <br />
          <strong>bjs-racing.com</strong>
        </div>

        {/* Print Button */}
        <div className="no-print" style={{ textAlign: "center", padding: "8px 4px 10px 4px" }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "6px 12px",
              fontSize: "10pt",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Print Label
          </button>
        </div>
    </div>
  );
}
