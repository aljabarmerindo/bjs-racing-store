// File: src/pages/api/shipping/biteship/auto-book-gojek.ts
// Trigger auto-booking GOJEK untuk order yang memenuhi syarat.
import type { APIRoute } from "astro";
import { processGojekAutoBooking } from "@/lib/gojekAutoBooking";

export const POST: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }

  try {
    const body = await context.request.json().catch(() => ({}));
    const orderId = body?.orderId;
    if (!orderId) {
      return new Response(
        JSON.stringify({ message: "orderId wajib diisi." }),
        { status: 400 },
      );
    }

    const result = await processGojekAutoBooking(orderId);
    return new Response(JSON.stringify(result), {
      status: result.booked ? 200 : 422,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Gagal memproses auto-booking GOJEK.",
      }),
      { status: 500 },
    );
  }
};
