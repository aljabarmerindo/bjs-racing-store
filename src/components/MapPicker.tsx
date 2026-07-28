// File: src/components/MapPicker.tsx
// Peta Leaflet dengan GPS auto-locate, marker toko, dan mode interaktif.
import React, { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_CENTER: [number, number] = [-6.5244682, 110.7674915];

const STORE_LAT = Number(import.meta.env.BITESHIP_ORIGIN_LAT || -6.5244682);
const STORE_LNG = Number(import.meta.env.BITESHIP_ORIGIN_LNG || 110.7674915);
const STORE_NAME = import.meta.env.BITESHIP_ORIGIN_NAME || "TOKO BJS RACING";

const storeIconHtml = `<div style="background-color:#ea580c;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`;
const customerIconHtml = `<div style="background-color:#3b82f6;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`;

export interface MapPickerResult {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  latitude?: string | number | null;
  longitude?: string | number | null;
  onSelect?: (result: MapPickerResult) => void;
  onLocationFound?: (lat: number, lng: number) => void;
  onLocationError?: (message: string) => void;
  height?: number | string;
  interactive?: boolean;
  autoLocate?: boolean;
  showStore?: boolean;
  locateKey?: number;
}

const MapPicker = ({
  latitude,
  longitude,
  onSelect,
  onLocationFound,
  onLocationError,
  height = 200,
  interactive = true,
  autoLocate = false,
  showStore = true,
  locateKey,
}: MapPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const getLat = () => {
    const v = typeof latitude === "string" ? parseFloat(latitude) : latitude;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const getLng = () => {
    const v = typeof longitude === "string" ? parseFloat(longitude) : longitude;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      LRef.current = L;

      const lat = getLat() ?? DEFAULT_CENTER[0];
      const lng = getLng() ?? DEFAULT_CENTER[1];

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
        dragging: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
      }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      if (showStore) {
        L.marker([STORE_LAT, STORE_LNG], {
          icon: L.divIcon({
            html: storeIconHtml,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          interactive: true,
        })
          .addTo(map)
          .bindPopup(`<b>${STORE_NAME}</b><br/>Lokasi Toko`);
      }

      const customerMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: customerIconHtml,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        draggable: interactive,
      }).addTo(map);

      if (interactive) {
        map.on("click", (e: any) => {
          customerMarker.setLatLng(e.latlng);
          onSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
        customerMarker.on("dragend", () => {
          const pos = customerMarker.getLatLng();
          onSelect?.({ lat: pos.lat, lng: pos.lng });
        });
      }

      markerRef.current = customerMarker;
      mapRef.current = map;

      setTimeout(() => map.invalidateSize(), 300);
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  }, [interactive, showStore]);

  const doLocate = useCallback(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    map.locate({ enableHighAccuracy: true, setView: true, maxZoom: 16 });

    const onFound = (e: any) => {
      const { lat, lng, accuracy } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: customerIconHtml,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          draggable: interactive,
        }).addTo(map);

        if (interactive) {
          map.on("click", (ev: any) => {
            marker.setLatLng(ev.latlng);
            onSelect?.({ lat: ev.latlng.lat, lng: ev.latlng.lng });
          });
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onSelect?.({ lat: pos.lat, lng: pos.lng });
          });
        }

        markerRef.current = marker;
      }

      map.setView([lat, lng], 16);

      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]).setRadius(accuracy);
      } else {
        circleRef.current = L.circle([lat, lng], {
          radius: accuracy,
          color: "#3b82f6",
          fillColor: "#93c5fd",
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
      }

      onLocationFound?.(lat, lng);
      map.off("locationfound", onFound);
      map.off("locationerror", onErr);
    };

    const onErr = (e: any) => {
      onLocationError?.(e.message || "GPS tidak tersedia.");
      map.off("locationfound", onFound);
      map.off("locationerror", onErr);
    };

    map.on("locationfound", onFound);
    map.on("locationerror", onErr);
  }, [interactive, onLocationFound, onLocationError, onSelect]);

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
    if (autoLocate && mapRef.current) {
      doLocate();
    }
  }, [autoLocate, locateKey]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const lat = getLat();
    const lng = getLng();
    if (lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 16);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.dragging.enable(interactive);
    if (interactive) {
      mapRef.current.doubleClickZoom.enable();
      mapRef.current.touchZoom.enable();
      mapRef.current.scrollWheelZoom.enable();
    } else {
      mapRef.current.doubleClickZoom.disable();
      mapRef.current.touchZoom.disable();
      mapRef.current.scrollWheelZoom.disable();
    }
    if (markerRef.current) markerRef.current.dragging(interactive);
  }, [interactive]);

  return (
    <div className="relative" style={{ zIndex: 0 }}>
      <div
        ref={containerRef}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          width: "100%",
          borderRadius: 12,
          zIndex: 0,
          position: "relative",
          touchAction: "pan-y",
        }}
      />
    </div>
  );
};

export default MapPicker;
