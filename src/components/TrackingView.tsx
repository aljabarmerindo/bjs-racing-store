// File: src/components/TrackingView.tsx
// Tracking pesanan publik untuk pelanggan (khusus BJS Express internal).
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getOsrmRoute } from "@/lib/osrm";
import { supabase } from "@/lib/supabaseBrowserClient";

const STORE_LAT = Number(import.meta.env.BITESHIP_ORIGIN_LAT || -6.5244682);
const STORE_LNG = Number(import.meta.env.BITESHIP_ORIGIN_LNG || 110.7674915);

const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: "Menunggu Pembayaran", color: "bg-slate-100 text-slate-700" },
  paid: { label: "Pembayaran Diterima", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "Dalam Pengiriman", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Pesanan Selesai", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-800" },
};

const ASSIGNMENT_STATUS_META: Record<string, { label: string; desc: string }> = {
  assigned: { label: "Menunggu Kurir Ambil", desc: "Pesanan sudah disiapkan toko dan menunggu kurir mengambil di toko." },
  picked: { label: "Barang Sudah Diambil", desc: "Kurir sudah mengambil pesanan dari toko." },
  in_transit: { label: "Dalam Perjalanan", desc: "Kurir sedang mengantarkan pesanan ke alamat kamu." },
  dropping_off: { label: "Sampai di Lokasi", desc: "Kurir sudah tiba di lokasi, pesanan sedang diserahkan." },
  completed: { label: "Pesanan Selesai", desc: "Pesanan sudah diterima. Terima kasih sudah berbelanja di BJS Racing Store!" },
  cancelled: { label: "Dibatalkan", desc: "Pengiriman dibatalkan." },
};

const formatRupiah = (n?: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const formatWaktu = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const WA_META: Record<string, string> = {
  assigned: "Menunggu kurir mengambil pesanan di toko",
  picked: "Barang sudah diambil kurir dari toko",
  in_transit: "Sedang dalam perjalanan menuju alamat kamu",
  dropping_off: "Kurir sudah tiba di lokasi",
  completed: "Pesanan sudah diterima",
  cancelled: "Pengiriman dibatalkan",
};

interface Props {
  orderNumber: string;
}

const TrackingView = ({ orderNumber }: Props) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courierLoc, setCourierLoc] = useState<{ lat: number; lng: number; t: string } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const courierLineRef = useRef<L.Polyline | null>(null);
  const destLineRef = useRef<L.Polyline | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(orderNumber)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Pesanan tidak ditemukan.");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Gagal memuat tracking.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [orderNumber]);

  // Live tracking: subscribe ke Supabase Realtime untuk lokasi kurir
  useEffect(() => {
    const asgId = data?.assignment?.id;
    const done = data?.assignment?.status === "completed" || data?.assignment?.status === "cancelled";
    if (!data?.is_internal || !asgId || done) {
      setCourierLoc(null);
      return;
    }
    const channel = supabase
      .channel(`courier-location-${asgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "courier_locations",
          filter: `assignment_id=eq.${asgId}`,
        },
        (payload: any) => {
          const r = payload.new;
          if (!r) return;
          setCourierLoc({
            lat: Number(r.lat),
            lng: Number(r.lng),
            t: r.recorded_at || new Date().toISOString(),
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.is_internal, data?.assignment?.id, data?.assignment?.status]);

  const destLat = Number(data?.address?.latitude);
  const destLng = Number(data?.address?.longitude);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return;
    if (!data?.is_internal) return;

    const map = L.map(mapContainer.current, { zoomControl: true }).setView(
      [(STORE_LAT + destLat) / 2, (STORE_LNG + destLng) / 2],
      13,
    );
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([STORE_LAT, STORE_LNG], {
      icon: L.divIcon({ html: `<div style="background:#ea580c;width:14px;height:14px;border-radius:50%;border:3px solid white"></div>`, className: "", iconSize: [14, 14], iconAnchor: [7, 7] }),
    }).addTo(map).bindPopup("<b>Toko BJS Racing</b>");

    L.marker([destLat, destLng], {
      icon: L.divIcon({ html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:3px solid white"></div>`, className: "", iconSize: [14, 14], iconAnchor: [7, 7] }),
    }).addTo(map).bindPopup("<b>Alamat Kamu</b>");

    getOsrmRoute([STORE_LNG, STORE_LAT], [destLng, destLat]).then((route) => {
      const latlngs = route.geometry.map(([lng, lat]) => [lat, lng] as [number, number]);
      destLineRef.current = L.polyline(latlngs, { color: "#f97316", weight: 4, opacity: 0.8, dashArray: route.fallback ? "8 10" : undefined }).addTo(map);
      if (!courierLoc) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
      }
    });

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapRef.current = null;
      courierMarkerRef.current = null;
      courierLineRef.current = null;
      destLineRef.current = null;
    };
  }, [destLat, destLng, data?.is_internal]);

  // Update marker kurir live + rute kurir -> tujuan
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !courierLoc) return;
    if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return;

    if (!courierMarkerRef.current) {
      courierMarkerRef.current = L.marker([courierLoc.lat, courierLoc.lng], {
        icon: L.divIcon({ html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(22,163,74,.2)"></div>`, className: "", iconSize: [16, 16], iconAnchor: [8, 8] }),
      }).addTo(map).bindPopup("<b>Lokasi Kurir</b>");
    } else {
      courierMarkerRef.current.setLatLng([courierLoc.lat, courierLoc.lng]);
    }

    getOsrmRoute([courierLoc.lng, courierLoc.lat], [destLng, destLat]).then((route) => {
      const latlngs = route.geometry.map(([lng, lat]) => [lat, lng] as [number, number]);
      if (!courierLineRef.current) {
        courierLineRef.current = L.polyline(latlngs, { color: "#16a34a", weight: 4, opacity: 0.9 }).addTo(map);
      } else {
        courierLineRef.current.setLatLngs(latlngs);
      }
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    });
  }, [courierLoc, destLat, destLng]);

  if (loading) {
    return <p className="text-center text-slate-500 py-16">Mencari pesanan...</p>;
  }
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <p className="text-red-600 font-semibold mb-2">{error || "Pesanan tidak ditemukan."}</p>
        <a href="/tracking" className="text-blue-600 hover:underline text-sm">
          &larr; Coba nomor lain
        </a>
      </div>
    );
  }

  const orderMeta = ORDER_STATUS_META[data.status] || { label: data.status, color: "bg-slate-100 text-slate-700" };
  const cd = data.courier_details || {};
  const asg = data.assignment;
  const status = asg?.status || (data.status === "completed" ? "completed" : cd.shipping_status || "assigned");
  const asgMeta = ASSIGNMENT_STATUS_META[status] || ASSIGNMENT_STATUS_META.assigned;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">Lacak Pesanan</h1>
        <a href="/tracking" className="text-blue-600 hover:underline text-sm">Lacak lainnya</a>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-slate-500">Nomor Pesanan</p>
            <p className="font-mono font-bold">{data.order_number}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${orderMeta.color}`}>
            {orderMeta.label}
          </span>
        </div>
        <div className="mt-3 text-sm text-slate-600">
          <p>Dibuat: {formatWaktu(data.created_at)}</p>
          {data.delivered_at ? <p>Selesai: {formatWaktu(data.delivered_at)}</p> : null}
        </div>
      </div>

      {data.is_internal && asg && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="font-bold">{asgMeta.label}</h2>
            {courierLoc && (
              <span className="ml-auto inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {courierLoc && (
            <p className="text-xs text-slate-500 mb-2">
              Lokasi kurir diperbarui: {formatWaktu(courierLoc.t)}
            </p>
          )}
          <p className="text-sm text-slate-600">{asgMeta.desc}</p>
          {asg.courier && (
            <p className="text-sm text-slate-600 mt-2">
              Kurir: <span className="font-medium">{asg.courier.name}</span>
              {asg.courier.phone ? ` (${asg.courier.phone})` : ""}
            </p>
          )}

          <div className="mt-4 space-y-0">
            {asg.events?.length > 0 ? (
              <ol className="relative border-l border-slate-200 ml-3 space-y-4">
                {asg.events.map((ev: any, i: number) => (
                  <li key={ev.id || i} className="ml-6">
                    <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full bg-orange-500 border-4 border-white" />
                    <p className="font-medium text-sm">
                      {ASSIGNMENT_STATUS_META[ev.status]?.label || ev.status}
                    </p>
                    <p className="text-xs text-slate-500">{formatWaktu(ev.created_at)}</p>
                    {ev.note ? <p className="text-xs text-slate-600 mt-1">"{ev.note}"</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">
                Status pengiriman akan diperbarui saat kurir mulai mengantarkan.
              </p>
            )}
          </div>
        </div>
      )}

      {asg?.photo_url ? (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
          <h2 className="font-bold mb-2">Bukti Pengiriman</h2>
          <img src={asg.photo_url} alt="Bukti pengiriman" className="rounded-lg w-full max-h-72 object-cover" />
        </div>
      ) : null}

      {data.is_internal && data.customer?.telepon && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
          <h2 className="font-bold mb-2">Butuh Bantuan?</h2>
          <a
            href={`https://wa.me/${String(data.customer.telepon).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
              `Halo, saya ingin bertanya tentang pesanan ${data.order_number} (${WA_META[status] || "sedang diproses"}).`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Chat via WhatsApp
          </a>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
        <h2 className="font-bold mb-2">Daftar Barang</h2>
        <ul className="divide-y divide-slate-100">
          {data.items.map((it: any, i: number) => (
            <li key={i} className="py-2 flex items-center gap-3">
              {it.image_url ? (
                <img src={it.image_url} alt={it.nama} className="w-12 h-12 object-cover rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 rounded-lg" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{it.nama}</p>
                <p className="text-xs text-slate-500">{it.quantity} x {formatRupiah(it.price)}</p>
              </div>
              <p className="text-sm font-semibold">{formatRupiah(it.price * it.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-3 border-t border-slate-100 text-sm">
          <p className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatRupiah(data.subtotal_products)}</span></p>
          <p className="flex justify-between"><span className="text-slate-500">Ongkir</span><span>{formatRupiah(data.shipping_cost)}</span></p>
          <p className="flex justify-between font-bold mt-1"><span>Total</span><span>{formatRupiah(data.total_amount)}</span></p>
        </div>
      </div>

      {data.is_internal && Number.isFinite(destLat) && Number.isFinite(destLng) && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
          <h2 className="font-bold mb-2">Rute Pengiriman</h2>
          <div ref={mapContainer} style={{ height: "300px", borderRadius: "12px" }} />
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-6">
        BJS Express • bjs-racing-store
      </div>
    </div>
  );
};

export default TrackingView;
