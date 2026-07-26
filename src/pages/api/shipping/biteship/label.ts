// File: src/pages/api/shipping/biteship/label.ts
// Generate shipping label PDF + PNG untuk print thermal printer.
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }

  const waybillId = context.url.searchParams.get("waybillId");
  const format = context.url.searchParams.get("format") || "pdf";

  if (!waybillId) {
    return new Response(
      JSON.stringify({ message: "waybillId wajib diisi." }),
      { status: 400 },
    );
  }

  // Placeholder response — integrasi label generator sebenarnya bisa menggunakan
  // library seperti `pdf-lib` atau `@react-pdf/renderer` untuk menghasilkan PDF/PNG.
  return new Response(
    JSON.stringify({
      message: `Label ${format.toUpperCase()} untuk waybill ${waybillId} belum diimplementasikan.`,
      waybillId,
      format,
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    },
  );
};
