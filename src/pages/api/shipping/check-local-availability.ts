import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url }) => {
  const destinationId = url.searchParams.get("destination_id");
  const weightParam = url.searchParams.get("weight");

  if (!destinationId) {
    return new Response(
      JSON.stringify({ message: "Parameter destination_id diperlukan." }),
      { status: 400 },
    );
  }

  try {
    const { data: area, error } = await supabaseAdmin
      .from("bjs_express_areas")
      .select("id, subdistrict_id, postal_code, district_name, city_name, province_name, shipping_cost, etd, max_weight_gram, service_name")
      .eq("subdistrict_id", destinationId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
    }

    if (!area) {
      return new Response(
        JSON.stringify({ available: false, reason: "outside_service_area" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (weightParam && Number(weightParam) > (area.max_weight_gram ?? 5000)) {
      return new Response(
        JSON.stringify({ available: false, reason: "over_weight", max_weight_gram: area.max_weight_gram }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const responsePayload = {
      available: true,
      area_id: area.id,
      name: area.service_name || "BJS Express",
      code: "internal",
      cost: area.shipping_cost ?? 0,
      service: area.service_name || "BJS Express",
      description: "",
      etd: area.etd || "6 - 8 Hours",
      max_weight_gram: area.max_weight_gram,
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
