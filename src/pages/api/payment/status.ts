// File: src/pages/api/payment/status.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async (context) => {
  const { session } = context.locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });
  }
  const orderId = context.url.searchParams.get("order_id");
  if (!orderId) {
    return new Response(JSON.stringify({ message: "order_id wajib diisi." }), {
      status: 400,
    });
  }
  try {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!customer) {
      return new Response(
        JSON.stringify({ message: "Profil customer tidak ditemukan." }),
        { status: 404 },
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .eq("customer_id", customer.id)
      .single();
    if (error || !order) {
      return new Response(
        JSON.stringify({ message: "Order tidak ditemukan." }),
        { status: 404 },
      );
    }
    return new Response(JSON.stringify({ status: order.status }), {
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
      }),
      { status: 500 },
    );
  }
};
