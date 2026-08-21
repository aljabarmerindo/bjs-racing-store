// File: src/components/OrderTrackingMap.tsx
import React, { useEffect, useRef, useState } from "react";
import { getOsrmRoute, formatDistance, formatDuration } from "@/lib/osrm";

const STORE_LAT = Number(import.meta.env.BITESHIP_ORIGIN_LAT || -6.5244682);
const STORE_LNG = Number(import.meta.env.BITESHIP_ORIGIN_LNG || 110.7674915);
const STORE_NAME = import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store";
const STORE_ADDRESS = import.meta.env.BITESHIP_ORIGIN_ADDRESS || "";

const storeIconHtml = `<div style="background-color:#ea580c;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`;
const customerIconHtml = `<div style="background-color:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`;

interface OrderTrackingMapProps {
  customerLat?: string | number | null;
  customerLng?: string | number | null;
  customerAddress?: string | null;
}

const OrderTrackingMap = ({
  customerLat,
  customerLng,
  customerAddress,
}: OrderTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    fallback: boolean;
  } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (typeof window === "undefined") return;

    let map: any = null;
    let routeLayer: any = null;
    let destroyed = false;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const originLat = Number.isFinite(STORE_LAT) ? STORE_LAT : -6.5244682;
      const originLng = Number.isFinite(STORE_LNG) ? STORE_LNG : 110.7674915;
      const destLat =
        typeof customerLat === "number" && Number.isFinite(customerLat)
          ? customerLat
          : Number.isFinite(STORE_LAT)
            ? STORE_LAT + 0.02
            : -6.5044682;
      const destLng =
        typeof customerLng === "number" && Number.isFinite(customerLng)
          ? customerLng
          : Number.isFinite(STORE_LNG)
            ? STORE_LNG + 0.02
            : 110.7874915;

      map = L.map(mapContainer.current!, {
        zoomControl: true,
        attributionControl: true,
      }).setView([(originLat + destLat) / 2, (originLng + destLng) / 2], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const storeMarker = L.marker([originLat, originLng], {
        icon: L.divIcon({
          html: storeIconHtml,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
      storeMarker.bindPopup(`<b>${STORE_NAME}</b><br/>${STORE_ADDRESS}`);

      const customerMarker = L.marker([destLat, destLng], {
        icon: L.divIcon({
          html: customerIconHtml,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
      customerMarker.bindPopup(
        `<b>Alamat Tujuan</b><br/>${customerAddress || "Customer"}`,
      );

      const handleResize = () => {
        map.invalidateSize();
      };
      window.addEventListener("resize", handleResize);

      const cleanup = () => {
        window.removeEventListener("resize", handleResize);
        if (map) {
          map.remove();
          map = null;
        }
      };

      getOsrmRoute(
        [originLng, originLat],
        [destLng, destLat],
      ).then((route) => {
        if (destroyed || !map) return;
        const fallbackUsed = route.fallback;
        const latlngs = route.geometry.map(([lng, lat]) => [lat, lng] as [number, number]);
        routeLayer = L.polyline(latlngs, {
          color: fallbackUsed ? "#f97316" : "#2563eb",
          weight: 5,
          opacity: 0.85,
          dashArray: fallbackUsed ? "8 10" : undefined,
        }).addTo(map);

        const bounds = L.latLngBounds(latlngs as [number, number][]);
        map.fitBounds(bounds, { padding: [40, 40] });

        setRouteInfo({
          distance: formatDistance(route.distanceMeters),
          duration: formatDuration(route.durationSeconds),
          fallback: route.fallback,
        });
      });

      return cleanup;
    };

    let cleanupFn: (() => void) | undefined;
    init().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      destroyed = true;
      if (cleanupFn) cleanupFn();
    };
  }, [customerLat, customerLng, customerAddress]);

  return (
    <div className="w-full">
      <div
        ref={mapContainer}
        style={{ height: "420px", width: "100%", borderRadius: "12px" }}
      />
      {routeInfo && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <p>
            Jarak: <span className="font-semibold text-slate-800">{routeInfo.distance}</span>
          </p>
          <p>
            Estimasi: <span className="font-semibold text-slate-800">{routeInfo.duration}</span>
          </p>
          {routeInfo.fallback && (
            <p className="text-xs text-orange-600">
              Menampilkan rute garis lurus
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderTrackingMap;
