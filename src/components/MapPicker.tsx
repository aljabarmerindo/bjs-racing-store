// File: src/components/MapPicker.tsx
import React, { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER: [number, number] = [-6.5244682, 110.7674915];

const pickerIconHtml = `<div style="background-color:#ea580c;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`;

export interface MapPickerResult {
  lat: number;
  lng: number;
  full_address: string;
  city: string;
  province: string;
  postal_code: string;
  district: string;
  subdistrict: string;
}

interface MapPickerProps {
  latitude?: string | number | null;
  longitude?: string | number | null;
  onSelect: (result: MapPickerResult) => void;
  height?: number | string;
}

const MapPicker = ({
  latitude,
  longitude,
  onSelect,
  height = 320,
}: MapPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const initMap = async () => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const L = (await import("leaflet")).default;
      setLeafletLoaded(true);

      const lat = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : DEFAULT_CENTER[0];
      const lng = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : DEFAULT_CENTER[1];

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: pickerIconHtml,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        draggable: true,
      }).addTo(map);

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        await fetchReverse(pos.lat, pos.lng);
      });

      map.on("click", async (e) => {
        marker.setLatLng(e.latlng);
        await fetchReverse(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  };

  const fetchReverse = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Gagal reverse geocode");
      const data = await res.json();
      onSelect({
        lat,
        lng,
        full_address: data.full_address || data.display_name || "",
        city: data.city || "",
        province: data.province || "",
        postal_code: data.postal_code || "",
        district: data.district || "",
        subdistrict: data.subdistrict || "",
      });
    } catch {
      onSelect({
        lat,
        lng,
        full_address: "",
        city: "",
        province: "",
        postal_code: "",
        district: "",
        subdistrict: "",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const lat = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;
    const lng = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;
    if (lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 15);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%", borderRadius: 12 }}
      />
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
          <p className="text-sm text-slate-600">Memuat alamat...</p>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
