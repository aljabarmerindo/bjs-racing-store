import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

function toMinutes(time: string | null | undefined): number {
  if (!time) return -1;
  const [hours, minutes] = String(time).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return -1;
  return hours * 60 + minutes;
}

function aggregateSchedule(areas: Array<{ open_time: string | null; cutoff_time: string | null; is_active?: boolean }>) {
  const active = areas.filter((a) => a.is_active);
  if (active.length === 0) {
    return { enabled: false, open_time: "08:00:00", cutoff_time: "15:00:00" };
  }

  const openTimes = active.map((a) => toMinutes(a.open_time)).filter((m) => m >= 0);
  const closeTimes = active.map((a) => toMinutes(a.cutoff_time)).filter((m) => m >= 0);

  const earliestOpen = openTimes.length > 0 ? Math.min(...openTimes) : 8 * 60;
  const latestClose = closeTimes.length > 0 ? Math.max(...closeTimes) : 15 * 60;

  const formatTime = (minutes: number) => {
    const h = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    return `${h}:${m}:00`;
  };

  return {
    enabled: true,
    open_time: formatTime(earliestOpen),
    cutoff_time: formatTime(latestClose),
  };
}

export const GET: APIRoute = async () => {
  try {
    const [gojekResult, bjsResult] = await Promise.all([
      supabaseAdmin
        .from("gojek_service_areas")
        .select("open_time, cutoff_time, is_active")
        .eq("is_active", true),
      supabaseAdmin
        .from("bjs_express_areas")
        .select("open_time, cutoff_time, is_active")
        .eq("is_active", true),
    ]);

    const gojekAreas = gojekResult.data || [];
    const bjsAreas = bjsResult.data || [];

    const gojekSchedule = aggregateSchedule(gojekAreas);
    const bjsSchedule = aggregateSchedule(bjsAreas);

    return new Response(
      JSON.stringify({
        gojek: gojekSchedule,
        bjs_express: bjsSchedule,
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
