// File: src/lib/courierAuth.ts
import type { APIContext } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export interface CourierAuth {
  ok: boolean;
  status: number;
  message: string;
  courierId?: string;
  courier?: any;
  session?: any;
}

export async function requireCourier(context: APIContext): Promise<CourierAuth> {
  const { session } = context.locals;
  if (!session) {
    return { ok: false, status: 401, message: "Tidak diizinkan" };
  }

  const { data, error } = await supabaseAdmin
    .from("couriers")
    .select("id, name, is_active")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return { ok: false, status: 403, message: "Akses ditolak" };
  }

  return { ok: true, status: 200, message: "ok", courierId: data.id, courier: data, session };
}
