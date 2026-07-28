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

    const rates = await getBiteshipRates({
      destination: {
        latitude: destination.latitude ? Number(destination.latitude) : undefined,
        longitude: destination.longitude ? Number(destination.longitude) : undefined,
        postal_code: destination.postal_code ? String(destination.postal_code) : undefined,
      },
      weight,
      couriers,
      value: body.value ? Number(body.value) : 0,
    });

    return new Response(JSON.stringify(rates), {
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
