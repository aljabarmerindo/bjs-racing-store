// File: src/pages/api/shipping/biteship/rates.ts
// Endpoint ongkir Biteship untuk checkout STORE.
import type { APIRoute } from "astro";
import { getBiteshipRates } from "@/lib/biteship";

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
    const couriers = String(body?.couriers || "gojek,pos,jne,jnt,sicepat").replace(/\s+/g, "");

    if (!weight || weight <= 0) {
      return new Response(
        JSON.stringify({ message: "Berat barang tidak valid." }),
        { status: 400 },
      );
    }

    const hasCoords = !!(destination.latitude && destination.longitude);
    const hasPostal = !!destination.postal_code;
    const courierList = couriers.split(",").map((c) => c.trim()).filter(Boolean);

    const gojekCouriers = courierList.filter((c) => c === "gojek");
    const regularCouriers = courierList.filter((c) => c !== "gojek");

    const calls: Promise<any>[] = [];

    if (gojekCouriers.length > 0 && hasCoords) {
      calls.push(
        getBiteshipRates({
          destination: {
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude),
          },
          weight,
          couriers: gojekCouriers.join(","),
        }).catch(() => []),
      );
    }

    if (regularCouriers.length > 0 && hasPostal) {
      calls.push(
        getBiteshipRates({
          destination: {
            postal_code: String(destination.postal_code),
          },
          weight,
          couriers: regularCouriers.join(","),
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
