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
  role?: string;
}

const ALLOWED_ROLES = ["courier", "admin", "owner"];

export async function requireCourier(context: APIContext): Promise<CourierAuth> {
  const { session } = context.locals;
  if (!session) {
    return { ok: false, status: 401, message: "Tidak diizinkan" };
  }

  // Ambil role dari profiles. Role kurir wajib punya baris couriers aktif;
  // admin/owner boleh melihat semua penugasan (mode monitoring) tanpa baris couriers.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = profile?.role;
  if (!ALLOWED_ROLES.includes(role)) {
    return { ok: false, status: 403, message: "Akses ditolak" };
  }

  const { data, error } = await supabaseAdmin
    .from("couriers")
    .select("id, name, is_active")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (role === "courier") {
    if (error || !data || !data.is_active) {
      return { ok: false, status: 403, message: "Akses ditolak" };
    }
  }

  return { ok: true, status: 200, message: "ok", courierId: data?.id, courier: data, session, role };
}
