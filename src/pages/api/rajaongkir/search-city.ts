// File: src/pages/api/rajaongkir/search-city.ts
// Perbaikan: Menambahkan type checking di dalam catch block untuk mengatasi error 'unknown'.

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const apiKey = import.meta.env.RAJAONGKIR_API_KEY;
  const query = url.searchParams.get("query");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ message: "API key tidak dikonfigurasi." }),
      {
        status: 500,
      },
    );
  }
  if (!query) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  try {
    const response = await fetch(
      `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${query}`,
      {
        method: "GET",
        headers: { key: apiKey },
      },
    );

    const result = await response.json();

    if (!response.ok || result.meta.status !== "success") {
      const errorMessage =
        result?.meta?.message || "Gagal mencari destinasi dari RajaOngkir.";
      return new Response(JSON.stringify({ message: errorMessage }), {
        status: result.meta.code || 500,
      });
    }

    return new Response(JSON.stringify(result.data || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    let errorMessage = "Terjadi kesalahan yang tidak diketahui pada server.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Gagal mengambil data RajaOngkir:", errorMessage);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
    });
  }
};
