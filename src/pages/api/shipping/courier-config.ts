import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async () => {
  try {
    const [gojekResult, bjsResult] = await Promise.all([
      supabaseAdmin
        .from("gojek_service_areas")
        .select("open_time, cutoff_time, is_active")
        .eq("is_active", true)
        .limit(1),
      supabaseAdmin
        .from("bjs_express_areas")
        .select("open_time, cutoff_time, is_active")
        .eq("is_active", true)
        .limit(1),
    ]);

    const gojek = gojekResult.data?.[0] || null;
    const bjs = bjsResult.data?.[0] || null;

    return new Response(
      JSON.stringify({
        gojek: {
          enabled: !!gojek,
          open_time: gojek?.open_time || "08:00:00",
          cutoff_time: gojek?.cutoff_time || "18:00:00",
        },
        bjs_express: {
          enabled: !!bjs,
          open_time: bjs?.open_time || "08:00:00",
          cutoff_time: bjs?.cutoff_time || "15:00:00",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Courier config error:", err);
    return new Response(
      JSON.stringify({ message: "Gagal memuat konfigurasi kurir." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
