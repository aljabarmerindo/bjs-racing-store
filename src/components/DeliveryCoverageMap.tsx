// File: src/components/DeliveryCoverageMap.tsx
import React, { useEffect, useRef } from "react";

const STORE_LAT = Number(import.meta.env.BITESHIP_ORIGIN_LAT || -6.5244682);
const STORE_LNG = Number(import.meta.env.BITESHIP_ORIGIN_LNG || 110.7674915);
const STORE_NAME = import.meta.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store";

const storeIconHtml = `<div style="background-color:#ea580c;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`;

interface DeliveryCoverageMapProps {
  height?: number | string;
}

const DeliveryCoverageMap = ({ height = 420 }: DeliveryCoverageMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (typeof window === "undefined") return;

    let map: any = null;
    let destroyed = false;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: true,
      }).setView([STORE_LAT, STORE_LNG], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const storeMarker = L.marker([STORE_LAT, STORE_LNG], {
        icon: L.divIcon({
          html: storeIconHtml,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(map);

      storeMarker.bindPopup(`<b>${STORE_NAME}</b><br/>Lokasi Toko`);

      const coverageCenter: [number, number] = [STORE_LAT, STORE_LNG];
      const coverageRadiusMeters = 8000;

      const coverageCircle = L.circle(coverageCenter, {
        radius: coverageRadiusMeters,
        color: "#ea580c",
        fillColor: "#fdba74",
        fillOpacity: 0.25,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map);

      coverageCircle.bindPopup("<b>Zona Pengiriman Internal</b><br/>Radius ~8 km");

      mapRef.current = map;

      return () => {
        if (map) {
          map.remove();
          mapRef.current = null;
        }
      };
    };

    let cleanupFn: (() => void) | undefined;
    init().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      destroyed = true;
      if (cleanupFn) cleanupFn();
    };
  }, []);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%", borderRadius: 12 }}
      />
      <div className="mt-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Zona Pengiriman Internal</p>
        <p>
          Area persebaran kurir internal BJS Racing Store sekitar toko (radius ~8 km).
          Jika alamat Anda berada dalam zona ini, Anda bisa memilih layanan pengiriman internal.
        </p>
      </div>
    </div>
  );
};

export default DeliveryCoverageMap;
