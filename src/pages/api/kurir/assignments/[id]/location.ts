// File: src/pages/api/kurir/assignments/[id]/location.ts
// Kirim lokasi realtime kurir untuk penugasan (live tracking).
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";
import { requireCourier } from "@/lib/courierAuth.ts";

export const POST: APIRoute = async (context) => {
  const auth = await requireCourier(context);
  if (!auth.ok) {
    return new Response(JSON.stringify({ message: auth.message }), { status: auth.status });
  }

  const assignmentId = context.params.id;
  if (!assignmentId) {
    return new Response(JSON.stringify({ message: "ID penugasan wajib diisi." }), { status: 400 });
  }

  let body: any = {};
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Body tidak valid." }), { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response(JSON.stringify({ message: "Koordinat lat/lng tidak valid." }), { status: 400 });
  }

  try {
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("courier_assignments")
      .select("id, status")
      .eq("id", assignmentId)
      .eq("courier_id", auth.courierId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!assignment) {
      return new Response(JSON.stringify({ message: "Penugasan tidak ditemukan." }), { status: 404 });
    }

    // Jangan rekam lokasi saat penugasan sudah selesai/dibatalkan
    if (assignment.status === "completed" || assignment.status === "cancelled") {
      return new Response(JSON.stringify({ message: "Penugasan sudah selesai." }), { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin.from("courier_locations").insert({
      assignment_id: assignmentId,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      accuracy: body.accuracy != null ? Number(body.accuracy) : null,
      heading: body.heading != null ? Number(body.heading) : null,
      speed: body.speed != null ? Number(body.speed) : null,
    });
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Kurir location error:", err);
    return new Response(JSON.stringify({ message: "Gagal menyimpan lokasi." }), { status: 500 });
  }
};
