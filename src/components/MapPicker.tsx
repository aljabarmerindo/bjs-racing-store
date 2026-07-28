// File: src/components/MapPicker.tsx
// Peta Leaflet dengan GPS auto-locate, marker toko, dan mode interaktif.
import React, { useEffect, useRef, useCallback } from "react";

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
  const clickHandlerRef = useRef<any>(null);
  const dragendHandlerRef = useRef<any>(null);

  const getLat = () => {
    const v = typeof latitude === "string" ? parseFloat(latitude) : latitude;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const getLng = () => {
    const v = typeof longitude === "string" ? parseFloat(longitude) : longitude;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const handleMapClick = useCallback(
    (e: any) => {
      if (!markerRef.current) return;
      markerRef.current.setLatLng(e.latlng);
      onSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    [onSelect],
  );

  const handleMarkerDrag = useCallback(() => {
    if (!markerRef.current) return;
    const pos = markerRef.current.getLatLng();
    onSelect?.({ lat: pos.lat, lng: pos.lng });
  }, [onSelect]);

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
        dragging: true,
        doubleClickZoom: false,
        touchZoom: false,
        scrollWheelZoom: false,
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
        draggable: true,
      }).addTo(map);

      clickHandlerRef.current = handleMapClick;
      dragendHandlerRef.current = handleMarkerDrag;

      markerRef.current = customerMarker;
      mapRef.current = map;

      setTimeout(() => map.invalidateSize(), 300);
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  }, [showStore, getLat, getLng]);

  const doLocate = useCallback(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    map.locate({ enableHighAccuracy: true, setView: true, maxZoom: 16 });

    const onFound = (e: any) => {
      const { lat, lng, accuracy } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
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
  }, [onLocationFound, onLocationError]);

  const updateInteractive = useCallback(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map) return;

    if (interactive) {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
    } else {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
    }

    if (marker) {
      if (interactive) {
        marker.dragging?.enable();
      } else {
        marker.dragging?.disable();
      }
    }
  }, [interactive]);

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
    updateInteractive();
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    if (interactive) {
      map.on("click", handleMapClick);
      marker.on("dragend", handleMarkerDrag);
    } else {
      map.off("click", handleMapClick);
      marker.off("dragend", handleMarkerDrag);
    }
  }, [interactive, handleMapClick, handleMarkerDrag]);

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
        }}
      />
    </div>
  );
};

export default MapPicker;
