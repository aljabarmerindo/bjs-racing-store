// File: /src/pages/api/shipping/check-local-availability.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url }) => {
  const destinationId = url.searchParams.get("destination_id");

  if (!destinationId) {
    return new Response(
      JSON.stringify({ message: "Parameter destination_id diperlukan." }),
      { status: 400 },
    );
  }

  try {
    const { data: zone, error } = await supabaseAdmin
      .from("internal_shipping_zones")
      .select("shipping_cost, zone_name")
      .eq("subdistrict_id", destinationId)
      .eq("is_active", true) // Hanya cari zona yang aktif
      .single();

    if (error || !zone) {
      // Jika tidak ditemukan, itu bukan error. Cukup kembalikan 'available: false'.
      return new Response(JSON.stringify({ available: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Jika zona ditemukan, kembalikan detailnya.
    const responsePayload = {
      available: true,
      name: "BJS Express",
      code: "internal",
      cost: zone.shipping_cost,
      service: "BJS Express",
      description: "",
      etd: "0 hari (sameday)",
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API Check Local Availability Error:", err);
    return new Response(
      JSON.stringify({ message: "Terjadi kesalahan pada server." }),
      { status: 500 },
    );
  }
};
