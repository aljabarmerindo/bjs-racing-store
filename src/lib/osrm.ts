// File: src/lib/osrm.ts

export interface OsrmRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][];
  fallback: boolean;
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export async function getOsrmRoute(
  origin: [number, number],
  destination: [number, number],
  timeoutMs = 5000,
): Promise<OsrmRoute> {
  const url = `${OSRM_BASE}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }

    const json = await response.json();
    const route = json.routes?.[0];
    if (!route) {
      throw new Error("OSRM: no route found");
    }

    const coords = route.geometry?.coordinates ?? [];
    const geometry: [number, number][] = coords.map((c: number[]) => [
      c[0],
      c[1],
    ]);

    return {
      distanceMeters: Math.round(route.distance ?? 0),
      durationSeconds: Math.round(route.duration ?? 0),
      geometry,
      fallback: false,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn("OSRM failed, fallback to straight line:", error);

    const dx = destination[0] - origin[0];
    const dy = destination[1] - origin[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    const distanceMeters = Math.round(dist * 111_000);
    const durationSeconds = Math.round(distanceMeters / 20);

    return {
      distanceMeters,
      durationSeconds,
      geometry: [origin, destination],
      fallback: true,
    };
  }
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
  }
  return `${mins} menit`;
}
