import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url }) => {
  const destinationId = url.searchParams.get("destination_id");
  const gojekCostParam = url.searchParams.get("gojek_cost");

  if (!destinationId) {
    return new Response(
      JSON.stringify({ message: "Parameter destination_id diperlukan." }),
      { status: 400 },
    );
  }

  try {
    let { data: area, error } = await supabaseAdmin
      .from("bjs_express_areas")
      .select("id, subdistrict_id, postal_code, district_name, city_name, province_name")
      .eq("subdistrict_id", destinationId)
      .eq("is_active", true)
      .maybeSingle();

    if (!area && error) {
      console.error("Supabase error:", error);
    }

    if (!area) {
      const gojekCost = gojekCostParam ? Number(gojekCostParam) : null;
      if (!gojekCost || gojekCost < 1000) {
        return new Response(JSON.stringify({ available: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ available: false, reason: "outside_service_area" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const gojekCost = gojekCostParam ? Number(gojekCostParam) : null;
    if (!gojekCost || gojekCost < 1000) {
      return new Response(JSON.stringify({ available: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bjsCost = gojekCost - 1000;

    const responsePayload = {
      available: true,
      name: "BJS RACING",
      code: "internal",
      cost: bjsCost,
      service: "BJS Express",
      description: "",
      etd: "6 - 8 Hours",
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
