// File: /src/pages/api/shipping/track.ts
// Tracking pengiriman: Biteship untuk kurir Biteship, RajaOngkir untuk kurir lain.
import type { APIRoute } from "astro";
import { getBiteshipTracking } from "@/lib/biteship";

const BITESHIP_CODES = new Set(["gojek", "pos", "jne", "jnt", "jntcargo"]);

const COURIER_NAMES: Record<string, string> = {
  gojek: 'Gojek',
  pos: 'POS Indonesia',
  jne: 'JNE',
  jnt: 'J&T Express',
  jntcargo: 'J&T Cargo',
  internal: 'BJS Express',
};

function toRajaongkirLike(trackingId: string, courier: string, tracking: Awaited<ReturnType<typeof getBiteshipTracking>>) {
  return {
    summary: {
      waybill_number: trackingId,
      courier_name: COURIER_NAMES[courier.toLowerCase()] || courier,
      service_code: "",
      status: tracking.status,
    },
    manifest: (tracking.history || []).map((h) => {
      const parts = (h.timestamp || "").split("T");
      const datePart = parts[0] || "";
      const timePart = parts[1] ? parts[1].split(".")[0] : "";
      return {
        manifest_description: h.note || h.status || "",
        manifest_date: datePart,
        manifest_time: timePart,
        city_name: h.location || "",
      };
    }),
  };
}

export const GET: APIRoute = async ({ url }) => {
  const awb = url.searchParams.get("awb");
  const courier = url.searchParams.get("courier");

  if (!awb || !courier) {
    return new Response(
      JSON.stringify({ message: "Parameter 'awb' dan 'courier' wajib diisi." }),
      { status: 400 },
    );
  }

  try {
    if (BITESHIP_CODES.has(courier.toLowerCase())) {
      const tracking = await getBiteshipTracking(awb);
      return new Response(JSON.stringify(toRajaongkirLike(awb, courier, tracking)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = import.meta.env.RAJAONGKIR_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ message: "RajaOngkir API key tidak dikonfigurasi." }),
        { status: 500 },
      );
    }

    const urlencoded = new URLSearchParams();
    urlencoded.append("awb", awb);
    urlencoded.append("courier", courier);

    const response = await fetch(
      "https://rajaongkir.komerce.id/api/v1/track/waybill",
      {
        method: "POST",
        headers: {
          key: apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlencoded.toString(),
      },
    );

    const result = await response.json();

    if (!response.ok || result.meta.status !== "success") {
      console.error("RajaOngkir Tracking API Error:", result);
      const errorMessage =
        result?.meta?.message || "Gagal melacak resi dari RajaOngkir.";
      return new Response(JSON.stringify({ message: errorMessage }), {
        status: response.status,
      });
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gagal memproses permintaan pelacakan:", error);
    return new Response(
      JSON.stringify({
        message: (error as Error).message || "Terjadi kesalahan pada server.",
      }),
      { status: 500 },
    );
  }
};
