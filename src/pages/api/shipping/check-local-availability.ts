import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url }) => {
  const destinationId = url.searchParams.get("destination_id");
  const weightParam = url.searchParams.get("weight");
  const villageParam = (url.searchParams.get("village") || "").trim();

  if (!destinationId) {
    return new Response(
      JSON.stringify({ message: "Parameter destination_id diperlukan." }),
      { status: 400 },
    );
  }

  try {
    const { data: areas, error } = await supabaseAdmin
      .from("bjs_express_areas")
      .select("id, subdistrict_id, postal_code, district_name, city_name, province_name, village_name, shipping_cost, etd, max_weight_gram, service_name")
      .eq("subdistrict_id", destinationId)
      .eq("is_active", true);

    if (error) {
      console.error("Supabase error:", error);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let area: any = null;

    if (villageParam) {
      // Harga spesifik desa/kelurahan: harus cocok persis, tanpa fallback.
      const norm = villageParam.toLowerCase();
      area = (areas || []).find(
        (a) => a.village_name && a.village_name.trim().toLowerCase() === norm,
      );
      if (!area) {
        return new Response(
          JSON.stringify({ available: false, reason: "village_not_covered" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
    } else {
      // Tanpa desa: gunakan baris "semua desa" (village_name kosong).
      area = (areas || []).find(
        (a) => !a.village_name || !a.village_name.trim(),
      );
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
