// File: src/lib/adminAuth.ts
import type { APIContext } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export interface AdminAuth {
  ok: boolean;
  status: number;
  message: string;
  session?: any;
}

export async function requireAdmin(context: APIContext): Promise<AdminAuth> {
  const { session } = context.locals;
  if (!session) {
    return { ok: false, status: 401, message: "Tidak diizinkan" };
  }
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (error || data?.role !== "admin") {
    return { ok: false, status: 403, message: "Akses ditolak" };
  }
  return { ok: true, status: 200, message: "ok", session };
}

export async function requireAdminOrServiceToken(context: APIContext): Promise<AdminAuth> {
  const authHeader = context.request.headers.get("authorization");
  const serviceToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const expectedToken = import.meta.env.ADMIN_API_TOKEN;

  if (expectedToken && serviceToken && serviceToken === expectedToken) {
    return { ok: true, status: 200, message: "ok" };
  }

  return requireAdmin(context);
}
