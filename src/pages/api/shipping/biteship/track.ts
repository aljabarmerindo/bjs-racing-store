// File: src/pages/api/shipping/biteship/track.ts
// Tracking pengiriman Biteship untuk customer/admin.
import type { APIRoute } from "astro";
import { getBiteshipTracking } from "@/lib/biteship";

export const GET: APIRoute = async (context) => {
  const trackingId = context.url.searchParams.get("trackingId");
  if (!trackingId) {
    return new Response(
      JSON.stringify({ message: "trackingId wajib diisi." }),
      { status: 400 },
    );
  }

  try {
    const tracking = await getBiteshipTracking(trackingId);
    return new Response(JSON.stringify(tracking), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Gagal mengambil tracking.",
      }),
      { status: 500 },
    );
  }
};
