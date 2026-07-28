// File: src/pages/api/shipping/biteship/search-area.ts
// Endpoint pencarian area/alamat menggunakan Biteship Maps Search Area.
import type { APIRoute } from "astro";
import { searchBiteshipAreas } from "@/lib/biteship";

export const GET: APIRoute = async (context) => {
  const q = context.url.searchParams.get("q") || "";
  if (!q) {
    return new Response(
      JSON.stringify({ message: "Parameter q wajib diisi." }),
      { status: 400 },
    );
  }

  try {
    const results = await searchBiteshipAreas(q);
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mencari area.";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
