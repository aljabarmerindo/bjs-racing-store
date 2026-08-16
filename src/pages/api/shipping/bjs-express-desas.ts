// File: src/pages/api/shipping/bjs-express-desas.ts
// Endpoint daftar desa/kelurahan BJS Express aktif per kecamatan (untuk dropdown alamat).
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url }) => {
  const subdistrictId = url.searchParams.get("subdistrict_id");

  if (!subdistrictId) {
    return new Response(
      JSON.stringify({ message: "Parameter subdistrict_id diperlukan." }),
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("bjs_express_areas")
      .select("village_name, shipping_cost, etd, max_weight_gram, is_active")
      .eq("subdistrict_id", subdistrictId)
      .eq("is_active", true);

    if (error) {
      console.error("BJS Express desas Supabase error:", error);
      return new Response(
        JSON.stringify({ message: "Gagal memuat daftar desa BJS Express." }),
        { status: 500 },
      );
    }

    const rows = data || [];
    const desas = rows
      .filter((r) => r.village_name && r.village_name.trim())
      .map((r) => ({
        village_name: r.village_name.trim(),
        shipping_cost: r.shipping_cost ?? 0,
        etd: r.etd || "6 - 8 Hours",
        max_weight_gram: r.max_weight_gram ?? 5000,
      }))
      .sort((a, b) => a.village_name.localeCompare(b.village_name));

    const hasAllDesa = rows.some(
      (r) => !r.village_name || !r.village_name.trim(),
    );

    return new Response(
      JSON.stringify({ desas, hasAllDesa }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("API BJS Express Desas Error:", err);
    return new Response(
      JSON.stringify({ message: "Terjadi kesalahan pada server." }),
      { status: 500 },
    );
  }
};
