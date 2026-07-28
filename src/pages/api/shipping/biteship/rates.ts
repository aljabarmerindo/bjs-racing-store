// File: src/pages/api/shipping/biteship/rates.ts
// Endpoint ongkir Biteship untuk checkout STORE.
// Optimized: combine all couriers into 1 call when both coords and postal code exist.
import type { APIRoute } from "astro";
import { getBiteshipRates } from "@/lib/biteship";

const ALL_COURIERS = ["gojek", "pos", "jne", "jnt", "jntcargo"];
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const ratesCache = new Map<string, CacheEntry>();

function getCacheKey(destination: any, weight: number, couriers: string, value: number) {
  const parts = [
    destination.latitude || "",
    destination.longitude || "",
    destination.postal_code || "",
    String(weight),
    couriers,
    String(value),
  ];
  return parts.join("|");
}

function getCachedRates(key: string) {
  const entry = ratesCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ratesCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedRates(key: string, data: any) {
  ratesCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export const POST: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }

  try {
    const body = await context.request.json().catch(() => ({}));
    const destination = body?.destination || {};
    const weight = Number(body?.weight || 0);
    const value = body.value ? Number(body.value) : 0;

    if (!weight || weight <= 0) {
      return new Response(
        JSON.stringify({ message: "Berat barang tidak valid." }),
        { status: 400 },
      );
    }

    const cacheKey = getCacheKey(destination, weight, body?.couriers || "", value);
    const cached = getCachedRates(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hasCoords = !!(destination.latitude && destination.longitude);
    const hasPostal = !!destination.postal_code;
    const couriers = String(body?.couriers || ALL_COURIERS.join(","));
    const normalizedCouriers = couriers
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .join(",");

    const calls: Promise<any[]>[] = [];

    if (hasCoords && hasPostal) {
      calls.push(
        getBiteshipRates({
          destination: {
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude),
            postal_code: String(destination.postal_code),
          },
          weight,
          couriers: normalizedCouriers || ALL_COURIERS.join(","),
          value,
        }).catch(() => []),
      );
    } else if (hasCoords) {
      calls.push(
        getBiteshipRates({
          destination: {
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude),
          },
          weight,
          couriers: normalizedCouriers || ALL_COURIERS.join(","),
          value,
        }).catch(() => []),
      );
    } else if (hasPostal) {
      calls.push(
        getBiteshipRates({
          destination: {
            postal_code: String(destination.postal_code),
          },
          weight,
          couriers: normalizedCouriers || ALL_COURIERS.join(","),
          value,
        }).catch(() => []),
      );
    }

    const results = await Promise.all(calls);
    const allRates = results.flat();

    setCachedRates(cacheKey, allRates);

    return new Response(JSON.stringify(allRates), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil tarif pengiriman.";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
