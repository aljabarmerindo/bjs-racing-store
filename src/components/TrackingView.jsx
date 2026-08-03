// File: /src/components/TrackingView.jsx
import React, { useState, useEffect } from "react";
import {
  FiLoader,
  FiSearch,
  FiPackage,
  FiTruck,
  FiMapPin,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
  FiCopy,
  FiCheck,
} from "react-icons/fi";

const formatTanggal = (dateString, timeString) => {
  const d = new Date(`${dateString} ${timeString}`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const courierOptions = [
  { code: "gojek", name: "Gojek" },
  { code: "pos", name: "POS Indonesia" },
  { code: "jne", name: "JNE" },
  { code: "jnt", name: "J&T Express" },
  { code: "jntcargo", name: "J&T Cargo" },
  { code: "internal", name: "BJS Express" },
];

const PHASES = ["Konfirmasi", "Penjemputan", "Pengiriman", "Selesai"];

const getPhase = (status) => {
  const s = String(status || "").toUpperCase();
  if (s.includes("DELIVER") || s.includes("SELESAI") || s.includes("TERKIRIM")) return 3;
  if (s.includes("TRANSIT") || s.includes("PERJALANAN")) return 2;
  if (s.includes("PICKUP") || s.includes("JEMPUT") || s.includes("AMBIL")) return 1;
  return 0;
};

const getStatusMeta = (status) => {
  const s = String(status || "").toUpperCase();
  const delivered =
    s.includes("DELIVER") || s.includes("SELESAI") || s.includes("TERKIRIM");
  const transit = s.includes("TRANSIT") || s.includes("PERJALANAN");
  if (delivered)
    return {
      label: "Tiba di tujuan",
      dot: "bg-emerald-500",
      ring: "ring-emerald-100",
      text: "text-emerald-600",
      icon: <FiCheckCircle className="w-6 h-6" />,
    };
  if (transit)
    return {
      label: "Dalam perjalanan",
      dot: "bg-blue-500",
      ring: "ring-blue-100",
      text: "text-blue-600",
      icon: <FiTruck className="w-6 h-6" />,
    };
  return {
    label: "Sedang diproses",
    dot: "bg-orange-500",
    ring: "ring-orange-100",
    text: "text-orange-600",
    icon: <FiPackage className="w-6 h-6" />,
  };
};

const STATUS_TRANSLATIONS = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  scheduled: 'Dijadwalkan',
  allocated: 'Kurir dialokasikan',
  picking_up: 'Kurir menuju lokasi penjemputan',
  picked: 'Barang diambil kurir',
  in_transit: 'Dalam perjalanan',
  dropping_off: 'Sedang diantar',
  delivered: 'Tiba di tujuan',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
};

const translateStatus = (status) => STATUS_TRANSLATIONS[String(status || '').toLowerCase()] || status;

const Stepper = ({ current }) => (
  <div className="flex items-start">
    {PHASES.map((label, i) => {
      const done = i < current;
      const active = i === current;
      const nodeCls = done
        ? "bg-emerald-500"
        : active
          ? "bg-orange-500"
          : "bg-slate-200 text-slate-500";
      const ring = active ? "ring-4 ring-orange-100 animate-pulse" : "";
      const nodeIcon = done ? (
        <FiCheck className="w-4 h-4" />
      ) : active ? (
        <FiTruck className="w-4 h-4" />
      ) : (
        <span className="text-sm font-bold">{i + 1}</span>
      );
      const labelCls = done
        ? "text-emerald-600"
        : active
          ? "text-slate-900"
          : "text-slate-400";
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1.5 w-16 sm:w-24 shrink-0">
            <span
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center ${nodeCls} ${ring}`}
            >
              {nodeIcon}
            </span>
            <span
              className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${labelCls}`}
            >
              {label}
            </span>
          </div>
          {i < PHASES.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-1 sm:mx-2 mt-4 min-w-4 ${done ? "bg-emerald-400" : "bg-slate-200"}`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const TrackingView = ({
  awb: initialAwb = null,
  courier: initialCourier = null,
}) => {
  const [awb, setAwb] = useState(initialAwb || "");
  const [courier, setCourier] = useState(initialCourier || "");
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const NOTE_TRANSLATIONS = [
    [/\bbiteship\b/gi, 'Biteship'],
    [/\b(gojek|jne|jnt|jntcargo|pos|internal)\b/gi, (m) => {
      const map = { gojek: 'Gojek', jne: 'JNE', jnt: 'J&T Express', jntcargo: 'J&T Cargo', pos: 'POS Indonesia', internal: 'BJS Express' };
      return map[m.toLowerCase()] || m;
    }],
    [/courier order is confirmed\./gi, 'Pesanan kurir dikonfirmasi.'],
    [/has been notified to pick up/i, 'telah dinotifikasi untuk penjemputan'],
    [/pickup number:\s*/gi, 'Nomor penjemputan: '],
    [/order number:\s*/gi, 'Nomor pesanan: '],
    [/\bdelivery delayed due to (?:bad )?weather\b/i, 'Pengiriman tertunda karena cuaca buruk'],
    [/\bdelivery delayed\b/i, 'Pengiriman tertunda'],
    [/delayed due to (?:bad )?weather/i, 'tertunda karena cuaca buruk'],
    [/\bbecause\b/i, 'karena'],
    [/recipient (?:was|is) not available/i, 'penerima tidak ada di tempat'],
    [/rescheduled(?: for (?:the )?next day)?/i, 'dijadwalkan ulang'],
    [/address (?:is )?not complete|incomplete address/i, 'alamat tidak lengkap'],
    [/attempted (?:to )?deliver/i, 'pernah mencoba mengantar'],
    [/failed to (?:deliver|pick up)/i, 'Pengiriman gagal'],
    [/\bcanceled|cancelled\b/i, 'Dibatalkan'],
  ];

  const translateNote = (text = '') => {
    const s = String(text);
    return NOTE_TRANSLATIONS.reduce((acc, [pattern, replacement]) => {
      return acc.replace(pattern, replacement);
    }, s);
  };

  const trackShipment = async (awbToTrack, courierToTrack) => {
    setLoading(true);
    setError(null);
    setTrackingData(null);
    try {
      const response = await fetch(
        `/api/shipping/track?awb=${awbToTrack}&courier=${courierToTrack}`,
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal melacak resi.");
      }
      setTrackingData(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan yang tidak dikenal.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAwb && initialCourier) {
      trackShipment(initialAwb, initialCourier);
    }
  }, [initialAwb, initialCourier]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!awb || !courier) {
      setError("Nomor resi dan kurir harus diisi.");
      return;
    }
    trackShipment(awb, courier);
  };

  const copyResi = () => {
    if (!trackingData?.summary?.waybill_number) return;
    navigator.clipboard
      .writeText(String(trackingData.summary.waybill_number))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  const meta = trackingData ? getStatusMeta(trackingData.summary?.status) : null;
  const currentPhase = trackingData ? getPhase(trackingData.summary?.status) : 0;
  const manifest = trackingData?.manifest || [];

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleFormSubmit}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={awb}
          onChange={(e) => setAwb(e.target.value)}
          placeholder="Masukkan Nomor Resi"
          className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-shadow duration-200"
          required
        />
        <select
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          className="w-full sm:w-auto p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-shadow duration-200 cursor-pointer"
          required
        >
          <option value="">Pilih Kurir</option>
          {courierOptions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer"
        >
          {loading ? (
            <FiLoader className="animate-spin" />
          ) : (
            <FiSearch />
          )}
          <span>{loading ? "Melacak..." : "Lacak"}</span>
        </button>
      </form>

      <div>
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-5 w-56 max-w-full bg-slate-100 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="h-4 w-40 bg-slate-100 rounded animate-pulse"></div>
            <div className="h-24 bg-slate-100 rounded-lg animate-pulse"></div>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 animate-fade-in-up">
            <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <FiAlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-sm">Gagal melacak resi</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {trackingData && meta && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 ${meta.dot}`}
                  >
                    {meta.icon}
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Status Pengiriman
                    </p>
                    <p className={`text-base sm:text-lg font-bold leading-snug ${meta.text}`}>
                      {meta.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => trackShipment(awb, courier)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 disabled:opacity-60 transition-colors duration-200 cursor-pointer"
                >
                  <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh Status
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-5 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 text-xs">No. Resi</p>
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-slate-800 font-mono truncate">
                      {trackingData.summary.waybill_number}
                    </p>
                    <button
                      onClick={copyResi}
                      title="Salin nomor resi"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-colors duration-200 cursor-pointer shrink-0"
                    >
                      {copied ? (
                        <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <FiCopy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Kurir</p>
                  <p className="font-bold text-slate-800">
                    {trackingData.summary.courier_name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Layanan</p>
                  <p className="font-bold text-slate-800 uppercase">
                    {trackingData.summary.service_code}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Status</p>
                  <p className="font-bold text-slate-800 capitalize">
                    {translateStatus(trackingData.summary.status)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6 sm:py-5">
              <Stepper current={currentPhase} />
            </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <h2 className="text-xl font-bold mb-5">Riwayat Pengiriman</h2>
              {manifest.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <FiPackage className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-700">Belum ada riwayat perjalanan</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Riwayat akan muncul setelah kurir memproses pesanan Anda.
                  </p>
                </div>
              ) : (
                <ul>
                  {manifest.map((item, index) => (
                    <li key={index} className="relative pl-14 pb-8 last:pb-0">
                      {index < manifest.length - 1 && (
                        <span className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-200"></span>
                      )}
                      <span
                        className={`absolute left-0 top-0 w-10 h-10 rounded-full text-white flex items-center justify-center ${
                          index === 0 ? `ring-4 ring-offset-2 ${meta.ring}` : "bg-slate-300"
                        }`}
                      >
                        {index === 0 ? (
                          meta.icon
                        ) : (
                          <FiClock className="w-5 h-5" />
                        )}
                      </span>
                      <p className="font-bold text-slate-800">
                        {translateNote(item.manifest_description)}
                      </p>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                        <FiClock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTanggal(item.manifest_date, item.manifest_time)}
                      </p>
                      {item.city_name && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <FiMapPin className="w-3 h-3" /> {item.city_name}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !trackingData && !initialAwb && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center animate-fade-in-up">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
              <FiSearch className="w-7 h-7" />
            </div>
            <p className="font-semibold text-slate-700">Lacak Pesanan Anda</p>
            <p className="text-sm text-slate-400 mt-1">
              Masukkan nomor resi dan pilih kurir untuk melihat status pengiriman.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingView;
