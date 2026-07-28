// File: src/pages/api/shipping/biteship/rates.ts
// Endpoint ongkir Biteship untuk checkout STORE.
// Split 2 panggilan: gojek via koordinat, reguler via kode pos.
import type { APIRoute } from "astro";
import { getBiteshipRates } from "@/lib/biteship";

const INSTANT_COURIERS = ["gojek"];
const REGULAR_COURIERS = ["pos", "jne", "jnt", "sicepat"];

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

    const hasCoords = !!(destination.latitude && destination.longitude);
    const hasPostal = !!destination.postal_code;

    const calls: Promise<any[]>[] = [];

    if (hasCoords) {
      calls.push(
        getBiteshipRates({
          destination: {
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude),
          },
          weight,
          couriers: INSTANT_COURIERS.join(","),
          value,
        }).catch(() => []),
      );
    }

    if (hasPostal) {
      calls.push(
        getBiteshipRates({
          destination: {
            postal_code: String(destination.postal_code),
          },
          weight,
          couriers: REGULAR_COURIERS.join(","),
          value,
        }).catch(() => []),
      );
    }

    const results = await Promise.all(calls);
    const allRates = results.flat();

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
